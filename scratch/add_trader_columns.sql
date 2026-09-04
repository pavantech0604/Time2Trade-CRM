-- ====================================================================
-- UPDATE ACTIVE TRADERS TABLE
-- Adds initial_capital, selected_service, and preferred_market columns
-- ====================================================================

ALTER TABLE public.active_traders 
ADD COLUMN IF NOT EXISTS initial_capital NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS selected_service TEXT,
ADD COLUMN IF NOT EXISTS preferred_market TEXT;
