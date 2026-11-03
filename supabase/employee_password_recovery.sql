-- Apply as the project owner. This does not change existing passwords.
BEGIN;
CREATE TABLE IF NOT EXISTS public.employee_recovery_attempts (
  email_hash text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS employee_recovery_attempts_email_time
ON public.employee_recovery_attempts(email_hash, created_at);
CREATE INDEX IF NOT EXISTS employee_recovery_attempts_ip_time
ON public.employee_recovery_attempts(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS public.employee_recovery_tickets (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
ALTER TABLE public.employee_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_recovery_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_recovery_attempts, public.employee_recovery_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.employee_recovery_attempts, public.employee_recovery_tickets TO service_role;

CREATE OR REPLACE FUNCTION public.crm_allow_employee_recovery(email_digest text, ip_digest text)
RETURNS boolean LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Serialize attempts for both keys so parallel requests cannot exceed limits.
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || ip_digest, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || email_digest, 0));
  DELETE FROM public.employee_recovery_attempts WHERE created_at < NOW() - INTERVAL '1 day';
  IF (SELECT COUNT(*) FROM public.employee_recovery_attempts
      WHERE email_hash = email_digest AND created_at > NOW() - INTERVAL '15 minutes') >= 5
     OR (SELECT COUNT(*) FROM public.employee_recovery_attempts
      WHERE ip_hash = ip_digest AND created_at > NOW() - INTERVAL '15 minutes') >= 30 THEN
    RETURN false;
  END IF;
  INSERT INTO public.employee_recovery_attempts(email_hash, ip_hash) VALUES (email_digest, ip_digest);
  DELETE FROM public.employee_recovery_tickets WHERE expires_at < NOW() - INTERVAL '1 day';
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.crm_consume_employee_recovery(ticket_digest text)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target_id uuid;
BEGIN
  UPDATE public.employee_recovery_tickets ticket
  SET consumed_at = NOW()
  WHERE token_hash = ticket_digest AND consumed_at IS NULL AND expires_at > NOW()
    AND EXISTS (SELECT 1 FROM public.users profile
                WHERE profile.id = ticket.user_id AND profile.role = 'employee'
                  AND profile.is_active = true AND profile.approval_status = 'approved')
  RETURNING user_id INTO target_id;
  RETURN target_id;
END $$;
REVOKE ALL ON FUNCTION public.crm_allow_employee_recovery(text,text), public.crm_consume_employee_recovery(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_allow_employee_recovery(text,text), public.crm_consume_employee_recovery(text)
TO service_role;
COMMIT;
