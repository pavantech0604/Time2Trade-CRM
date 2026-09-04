-- ====================================================================
-- SEED MOCK USERS INTO SUPABASE
-- Inserts the frontend's fallback mock users into the database so that 
-- foreign key constraints pass when adding leads or traders.
-- ====================================================================

INSERT INTO public.users (id, name, email, role, is_active) 
VALUES
('10000000-0000-0000-0000-000000000001', 'Karthik Muni', 'karthik@time2trade.com', 'admin', true),
('10000000-0000-0000-0000-000000000002', 'Priya Verma', 'priya.v@time2trade.com', 'employee', true),
('10000000-0000-0000-0000-000000000003', 'Ankit Kumar', 'ankit.k@time2trade.com', 'employee', true),
('10000000-0000-0000-0000-000000000004', 'Vikram Malhotra', 'vikram.m@time2trade.com', 'employee', true),
('10000000-0000-0000-0000-000000000005', 'Rahul Dev', 'rahul.d@time2trade.com', 'employee', true)
ON CONFLICT (id) DO NOTHING;
