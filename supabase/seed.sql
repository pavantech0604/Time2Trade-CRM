-- ====================================================================
-- STOCK ADVISORY & TRADING SUPPORT PLATFORM - SEED DATA
-- ====================================================================

-- 1. Insert Users (Admin, Telecallers, Relationship Managers)
INSERT INTO public.users (id, name, email, phone, role) VALUES
('10000000-0000-0000-0000-000000000001', 'Karthik Muni', 'karthik@time2trade.com', '+91 98765 43210', 'admin'),
('10000000-0000-0000-0000-000000000002', 'Priya Verma', 'priya.v@time2trade.com', '+91 98765 43211', 'employee'),
('10000000-0000-0000-0000-000000000003', 'Ankit Kumar', 'ankit.k@time2trade.com', '+91 98765 43212', 'employee'),
('10000000-0000-0000-0000-000000000004', 'Vikram Malhotra', 'vikram.m@time2trade.com', '+91 98765 43213', 'employee'),
('10000000-0000-0000-0000-000000000005', 'Rahul Saxena', 'rahul.s@time2trade.com', '+91 98765 43214', 'employee')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Leads
INSERT INTO public.leads (
    id, name, phone, source, assigned_to, rm_assigned_to, status,
    notes, rm_notes, investment_capacity, trading_experience, preferred_market, next_follow_up_at
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'Aarav Mehta',
    '+91 98111 22334',
    'Meta Ads',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'interested',
    'Interested in Nifty F&O options. High capital.',
    'Scheduled onboarding call.',
    '₹5,000,000',
    'intermediate',
    'F&O',
    NOW() + INTERVAL '1 day'
),
(
    '20000000-0000-0000-0000-000000000002',
    'Sneha Kapoor',
    '+91 98222 33445',
    'Google Ads',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    'active_trader',
    'Wants daily intraday signals.',
    'Converted into active trader on 2026-08-01.',
    '₹1,000,000',
    'advanced',
    'Equity',
    NULL
),
(
    '20000000-0000-0000-0000-000000000003',
    'Rohan Gupta',
    '+91 98333 44556',
    'Referral',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000005',
    'interested',
    'Discussed profit sharing terms (20%).',
    'Needs follow up tomorrow regarding bank mandate.',
    '₹2,500,000',
    'intermediate',
    'F&O',
    NOW() + INTERVAL '2 days'
),
(
    '20000000-0000-0000-0000-000000000004',
    'Kavita Joshi',
    '+91 98444 55667',
    'Meta Ads',
    '10000000-0000-0000-0000-000000000002',
    NULL,
    'called',
    'Asked to call back post market hours.',
    NULL,
    '₹500,000',
    'beginner',
    'Equity',
    NOW() + INTERVAL '4 hours'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Active Traders
INSERT INTO public.active_traders (
    id, lead_id, name, phone, rm_assigned_to, status, joined_at, current_streak, longest_streak, last_trade_date, total_profit_gained, total_profit_shared
) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Sneha Kapoor',
    '+91 98222 33445',
    '10000000-0000-0000-0000-000000000004',
    'active',
    '2026-08-01',
    5,
    8,
    '2026-08-19',
    345000.00,
    69000.00
),
(
    '30000000-0000-0000-0000-000000000002',
    NULL,
    'Devendra Patel',
    '+91 98555 66778',
    '10000000-0000-0000-0000-000000000004',
    'active',
    '2026-07-15',
    12,
    14,
    '2026-08-19',
    820000.00,
    164000.00
),
(
    '30000000-0000-0000-0000-000000000003',
    NULL,
    'Amitabh Singhania',
    '+91 98666 77889',
    '10000000-0000-0000-0000-000000000005',
    'active',
    '2026-08-10',
    3,
    5,
    '2026-08-18',
    195000.00,
    39000.00
)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Trading Days
INSERT INTO public.trading_days (trader_id, trade_date, total_profit, trades_count, is_winning_day) VALUES
('30000000-0000-0000-0000-000000000001', '2026-08-15', 45000.00, 4, true),
('30000000-0000-0000-0000-000000000001', '2026-08-16', 32000.00, 3, true),
('30000000-0000-0000-0000-000000000001', '2026-08-17', 68000.00, 5, true),
('30000000-0000-0000-0000-000000000001', '2026-08-18', 75000.00, 6, true),
('30000000-0000-0000-0000-000000000001', '2026-08-19', 125000.00, 7, true),

('30000000-0000-0000-0000-000000000002', '2026-08-17', 110000.00, 8, true),
('30000000-0000-0000-0000-000000000002', '2026-08-18', 140000.00, 10, true),
('30000000-0000-0000-0000-000000000002', '2026-08-19', 180000.00, 12, true)
ON CONFLICT (trader_id, trade_date) DO UPDATE SET total_profit = EXCLUDED.total_profit, trades_count = EXCLUDED.trades_count;

-- 5. Insert Payments
INSERT INTO public.payments (
    id, trader_id, employee_id, amount, payment_mode, utr, transaction_time, screenshot_url, status, admin_remarks, verified_at
) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000004',
    69000.00,
    'UPI',
    'UTR994820194821',
    NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=60',
    'approved',
    'Verified via HDFC Bank UPI statements.',
    NOW() - INTERVAL '1 day'
),
(
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000004',
    164000.00,
    'Bank Transfer',
    'IMPS883019284711',
    NOW() - INTERVAL '3 hours',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=60',
    'pending_verification',
    NULL,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Expenses
INSERT INTO public.expenses (id, date, category, amount, description, added_by, receipt_url) VALUES
('50000000-0000-0000-0000-000000000001', '2026-08-01', 'Ads', 45000.00, 'Meta Lead Gen Campaign August', '10000000-0000-0000-0000-000000000001', NULL),
('50000000-0000-0000-0000-000000000002', '2026-08-05', 'Software', 18500.00, 'TradingView & Bloomberg Terminal Subscriptions', '10000000-0000-0000-0000-000000000001', NULL),
('50000000-0000-0000-0000-000000000003', '2026-08-10', 'Salary', 120000.00, 'Telecaller & RM Commissions', '10000000-0000-0000-0000-000000000001', NULL)
ON CONFLICT (id) DO NOTHING;
