-- ====================================================================
-- RESTORE SUPABASE DEFAULT PERMISSIONS
-- Run this to fix the "401 Unauthorized" error caused by dropping the public schema.
-- ====================================================================

-- 1. Grant usage on the public schema to all necessary Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant privileges on all existing tables in the public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Set default privileges for any future tables created by the postgres role
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
