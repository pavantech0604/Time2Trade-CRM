-- Project: lqydkbfxbaxrgbvdznxn. Run the ENTIRE file in SQL Editor as owner.
-- Based on the account mapping supplied 2026-11-03. Passwords on the retained
-- Auth accounts are never changed. Ramesh is deliberately left for review.
-- Any unexpected account mapping or uniqueness conflict rolls back all work.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;

-- Keep owner-only recovery snapshots, including the two removed Auth records.
CREATE SCHEMA IF NOT EXISTS crm_maintenance;
REVOKE ALL ON SCHEMA crm_maintenance FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS crm_maintenance.staff_cleanup_backup (
  batch text NOT NULL,
  entity text NOT NULL,
  row_hash text NOT NULL,
  row_data jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (batch, entity, row_hash)
);
REVOKE ALL ON ALL TABLES IN SCHEMA crm_maintenance FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  mapping record;
  reference_column record;
  old_profile jsonb;
  column_list text;
  value_list text;
  row_count bigint;
  batch_name constant text := '2026-11-03-confirmed-staff-cleanup';
BEGIN
  FOR mapping IN SELECT * FROM (VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid, 'a8e3c034-b564-418e-85ce-ffd03d7a20ba'::uuid,
      'karthik@time2trade.com', 'karthik@time2trade.com', 'manager', true),
    ('a2e51b6b-3a79-4791-a992-01e41df4fb9e'::uuid, '5f30903d-2106-44b7-8bd4-7f02e8867a91'::uuid,
      'mahaan@time2trade.com', 'mahaan@time2trade.com', 'admin', true),
    ('60efb575-c991-4a4a-b82c-f96e599b880f'::uuid, '50a38af4-74e4-4941-b690-94b23008d785'::uuid,
      'lokeshtimetotrade@gmail.com', 'lokesh@time2trade.com', 'employee', false),
    ('89d8ec24-13c5-4169-be6e-b2648d3e29bf'::uuid, 'af554cef-d912-41b6-9369-9a24c4f6651c'::uuid,
      'madhan@tame2trade.com', 'madhakumar@time2trade.com', 'employee', false)
  ) AS pairs(old_id, keep_id, old_email, keep_email, expected_role, repair_profile)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = mapping.keep_id AND lower(trim(email)) = mapping.keep_email) THEN
      RAISE EXCEPTION 'Retained Auth account is missing or changed: %', mapping.keep_email;
    END IF;

    IF mapping.repair_profile THEN
      SELECT to_jsonb(profile) INTO old_profile FROM public.users profile WHERE id = mapping.old_id;
      IF old_profile IS NOT NULL THEN
        IF lower(trim(old_profile->>'email')) <> mapping.old_email
           OR old_profile->>'role' <> mapping.expected_role
           OR old_profile->>'approval_status' <> 'approved'
           OR old_profile->>'is_active' <> 'true'
           OR EXISTS (SELECT 1 FROM public.users WHERE id = mapping.keep_id)
           OR EXISTS (SELECT 1 FROM auth.users WHERE id = mapping.old_id) THEN
          RAISE EXCEPTION 'Profile mapping changed; review required for %', mapping.keep_email;
        END IF;
        INSERT INTO crm_maintenance.staff_cleanup_backup(batch, entity, row_hash, row_data)
        VALUES (batch_name, 'public.users', md5(old_profile::text), old_profile) ON CONFLICT DO NOTHING;

        -- Free the unique email while cloning all profile fields to the real Auth ID.
        UPDATE public.users SET email = 'merged-' || mapping.old_id || '@invalid.time2trade.local'
        WHERE id = mapping.old_id;
        SELECT string_agg(format('%I', attname), ',' ORDER BY attnum),
               string_agg(format('(jsonb_populate_record(NULL::public.users, $1)).%I', attname), ',' ORDER BY attnum)
          INTO column_list, value_list
        FROM pg_attribute
        WHERE attrelid = 'public.users'::regclass AND attnum > 0 AND NOT attisdropped
          AND attgenerated = '' AND attidentity <> 'a';
        EXECUTE format('INSERT INTO public.users (%s) SELECT %s', column_list, value_list)
          USING old_profile || jsonb_build_object('id', mapping.keep_id);
      END IF;
    ELSE
      -- The duplicate Auth login must not secretly own an independent CRM profile.
      IF EXISTS (SELECT 1 FROM public.users WHERE id = mapping.old_id) THEN
        RAISE EXCEPTION 'Duplicate now has a CRM profile; review required: %', mapping.old_email;
      END IF;
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = mapping.old_id AND lower(trim(email)) <> mapping.old_email) THEN
        RAISE EXCEPTION 'Duplicate Auth account changed: %', mapping.old_id;
      END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users
      WHERE id = mapping.keep_id AND lower(trim(email)) = mapping.keep_email
        AND role = mapping.expected_role AND is_active = true AND approval_status = 'approved') THEN
      RAISE EXCEPTION 'Retained profile is not active and approved: %', mapping.keep_email;
    END IF;

    -- Move declared user references, plus known legacy columns lacking FKs.
    -- Auth-internal sessions/identities are excluded; removed logins lose sessions.
    FOR reference_column IN
      SELECT DISTINCT namespace.nspname AS schema_name, relation.relname AS table_name,
                      attribute.attname AS column_name, format_type(attribute.atttypid, attribute.atttypmod) AS column_type
      FROM pg_attribute attribute
      JOIN pg_class relation ON relation.oid = attribute.attrelid
      JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
      WHERE relation.relkind IN ('r', 'p') AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND attribute.attgenerated = '' AND namespace.nspname NOT IN ('auth', 'crm_maintenance', 'pg_catalog', 'information_schema')
        AND namespace.nspname NOT LIKE 'pg_%'
        AND attribute.atttypid IN ('uuid'::regtype, 'text'::regtype, 'varchar'::regtype)
        AND NOT (relation.oid = 'public.users'::regclass AND attribute.attname = 'id')
        AND (
          EXISTS (SELECT 1 FROM pg_constraint constraint_row
            WHERE constraint_row.contype = 'f' AND constraint_row.conrelid = relation.oid
              AND attribute.attnum = ANY(constraint_row.conkey)
              AND constraint_row.confrelid IN ('public.users'::regclass, 'auth.users'::regclass))
          OR (namespace.nspname = 'public' AND attribute.attname IN (
            'user_id', 'employee_id', 'submitted_by_employee_id', 'manager_id', 'approved_by',
            'added_by', 'created_by', 'assigned_to', 'assigned_by', 'transferred_to_employee_id',
            'verified_by', 'sender_id', 'receiver_id', 'uploaded_by', 'previous_employee_id'))
        )
    LOOP
      EXECUTE format(
        'INSERT INTO crm_maintenance.staff_cleanup_backup(batch, entity, row_hash, row_data)
         SELECT $2, $3, md5(to_jsonb(source_row)::text), to_jsonb(source_row) FROM %I.%I source_row
         WHERE %I::text = $1 ON CONFLICT DO NOTHING',
        reference_column.schema_name, reference_column.table_name, reference_column.column_name)
        USING mapping.old_id::text, batch_name, reference_column.schema_name || '.' || reference_column.table_name;
      EXECUTE format('UPDATE %I.%I SET %I = $1::%s WHERE %I::text = $2',
        reference_column.schema_name, reference_column.table_name, reference_column.column_name,
        reference_column.column_type, reference_column.column_name)
        USING mapping.keep_id::text, mapping.old_id::text;
    END LOOP;

    IF mapping.repair_profile THEN
      DELETE FROM public.users WHERE id = mapping.old_id;
    ELSE
      INSERT INTO crm_maintenance.staff_cleanup_backup(batch, entity, row_hash, row_data)
      SELECT batch_name, 'auth.users', md5(to_jsonb(account)::text), to_jsonb(account)
      FROM auth.users account WHERE id = mapping.old_id ON CONFLICT DO NOTHING;
      INSERT INTO crm_maintenance.staff_cleanup_backup(batch, entity, row_hash, row_data)
      SELECT batch_name, 'auth.identities', md5(to_jsonb(identity_row)::text), to_jsonb(identity_row)
      FROM auth.identities identity_row WHERE user_id = mapping.old_id ON CONFLICT DO NOTHING;
      DELETE FROM auth.users WHERE id = mapping.old_id;
    END IF;

    -- Confirm retained internal identifiers without changing their passwords.
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = mapping.keep_id;
    RAISE NOTICE 'Completed account mapping for %', mapping.keep_email;
  END LOOP;
END $$;

COMMIT;

SELECT profile.name, profile.email, profile.role,
       profile.id = account.id AS auth_id_matches,
       account.email_confirmed_at IS NOT NULL AS confirmed
FROM public.users profile LEFT JOIN auth.users account ON account.id = profile.id
WHERE profile.email IN ('karthik@time2trade.com', 'mahaan@time2trade.com',
                        'lokesh@time2trade.com', 'madhakumar@time2trade.com')
ORDER BY profile.name;
