export type UserRole = 'pending' | 'admin' | 'telecaller' | 'relationship_manager';

export type ApprovalStatus = 'pending_admin_review' | 'approved' | 'rejected';

export type UserPresenceStatus = 'offline' | 'online' | 'on_break' | 'on_lunch';

export type AttendanceEventType =
  | 'login'
  | 'logout'
  | 'break_start'
  | 'break_end'
  | 'lunch_start'
  | 'lunch_end';

export type LeadStatus =
  | 'new'
  | 'called'
  | 'not_answered'
  | 'callback_requested'
  | 'interested'
  | 'not_interested'
  | 'wrong_number'
  | 'invalid_data'
  | 'converted'
  | 'archived'
  | 'lost'
  | 'follow_up_later'
  | 'interested_rm_required'
  | 'rm_contacted'
  | 'active_trader';

export type TraderStatus = 'active' | 'inactive';

export type PaymentStatus = 'pending_verification' | 'approved' | 'rejected';

export type PaymentMode = 'UPI' | 'Bank Transfer' | 'Other';

export type TradingExperience = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active?: boolean;
  approval_status?: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  last_sign_in_at?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_role?: UserRole;
  event_type: AttendanceEventType;
  event_time: string;
  status_before?: UserPresenceStatus;
  status_after?: UserPresenceStatus;
  metadata?: Record<string, any>;
}

export interface UserPresence {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  current_status: UserPresenceStatus;
  last_status_change: string;
  today_login_time?: string;
  today_logout_time?: string;
  total_break_minutes: number;
  total_lunch_minutes: number;
  is_late?: boolean;
}

export interface LeadUploadBatch {
  id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  file_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  distribution_date: string;
  telecallers_distributed: number;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language?: string;
  source: string;
  assigned_to?: string; // telecaller user_id
  assigned_to_name?: string;
  rm_assigned_to?: string; // relationship_manager user_id
  rm_assigned_to_name?: string;
  status: LeadStatus;
  telecaller_notes?: string;
  rm_notes?: string;
  investment_capacity?: string;
  trading_experience?: TradingExperience;
  preferred_market?: string;
  next_follow_up_at?: string;
  upload_batch_id?: string;
  upload_date?: string; // YYYY-MM-DD
  is_archived?: boolean;
  archived_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface ActiveTrader {
  id: string;
  lead_id?: string;
  name: string;
  phone: string;
  email?: string;
  language?: string;
  rm_assigned_to: string; // relationship_manager user_id
  rm_assigned_to_name?: string;
  status: TraderStatus;
  joined_at: string;
  initial_capital?: number;
  trading_experience?: TradingExperience;
  preferred_market?: string;
  notes?: string;
  current_streak: number;
  longest_streak: number;
  last_trade_date?: string;
  total_profit_gained: number;
  total_profit_shared: number;
  created_at: string;
  updated_at?: string;
}

export interface TradingDay {
  id: string;
  trader_id: string;
  trade_date: string;
  total_profit: number;
  trades_count: number;
  is_winning_day: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  trader_id: string;
  trader_name?: string;
  trader_phone?: string;
  employee_id?: string;
  employee_name?: string;
  amount: number;
  payment_mode: PaymentMode;
  utr: string;
  transaction_time: string;
  screenshot_url: string;
  status: PaymentStatus;
  admin_remarks?: string;
  verified_at?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  added_by?: string;
  added_by_name?: string;
  receipt_url?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  is_read: boolean;
  link_path?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}

export type DateFilter = 'today' | 'this_week' | 'this_month' | 'all';

export interface FilterState {
  dateFilter: DateFilter;
  searchQuery?: string;
  statusFilter?: string;
  userFilter?: string;
}

export interface DashboardKPIs {
  totalLeads: number;
  activeTraders: number;
  totalProfitShared: number;
  netProfit: number;
  pendingHandoffsCount: number;
  pendingVerificationCount: number;
  totalExpenses: number;
}
