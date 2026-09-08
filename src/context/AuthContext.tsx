import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  ApprovalStatus,
  UserPresenceStatus,
  AttendanceEventType,
  AttendanceLog,
  UserPresence,
  Lead,
  ActiveTrader,
  TradingDay,
  Payment,
  PaymentStatus,
  PaymentAllocation,
  Expense,
  NotificationItem,
  AuditLog,
  FilterState,
  DateFilter,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_LEADS,
  INITIAL_TRADERS,
  INITIAL_TRADING_DAYS,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_USER_PRESENCE,
  INITIAL_ATTENDANCE_LOGS,
} from '../lib/mockData';
import { calculateTraderStreak } from '../lib/calculations';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthResponse {
  success: boolean;
  status?: 'approved' | 'pending' | 'rejected' | 'disabled' | 'error';
  message?: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;

  // Auth actions
  signup: (fullName: string, email: string, password: string, phone?: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;

  // Presence & Attendance
  currentPresence: UserPresence | null;
  presenceList: UserPresence[];
  attendanceLogs: AttendanceLog[];
  updateUserPresence: (newStatus: UserPresenceStatus) => void;

  // Admin Review & Employee Management
  assignRoleAndApprove: (userId: string, role: UserRole) => Promise<void>;
  rejectEmployee: (userId: string, reason: string) => Promise<void>;
  toggleEmployeeActive: (userId: string, isActive: boolean) => Promise<void>;

  // App data state
  leads: Lead[];
  traders: ActiveTrader[];
  tradingDays: TradingDay[];
  payments: Payment[];
  expenses: Expense[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];

  // Filter State
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setDateFilter: (df: DateFilter) => void;

  // Actions
  addLead: (leadInput: Omit<Lead, 'id' | 'created_at'>) => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  handoffLead: (
    leadId: string,
    qualification: {
      investment_capacity: string;
      trading_experience: Lead['trading_experience'];
      preferred_market: string;
      employee_notes?: string;
      assigned_to?: string;
    }
  ) => void;
  convertLeadToTrader: (
    leadId: string, 
    rmId: string, 
    details?: { initialCapital: number; selectedService: string; preferredMarket: string }
  ) => void;
  addTradingDay: (traderId: string, tradeDate: string, totalProfit: number, tradesCount: number) => void;
  addPayment: (paymentInput: Omit<Payment, 'id' | 'created_at' | 'status'>) => void;
  verifyPayment: (paymentId: string, isApproved: boolean, remarks?: string) => void;
  addExpense: (expenseInput: Omit<Expense, 'id' | 'created_at'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId?: string) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: (userId?: string) => void;
  updateUserAvatar: (url: string) => Promise<void>;

  // Visual Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
  );
};

const MOCK_USER_NAMES = ['Priya Verma', 'Ankit Kumar', 'Vikram Malhotra', 'Rahul Saxena', 'Rajesh Sharma'];

const isMockId = (id?: string | null) => {
  if (!id) return false;
  return (
    id === '10000000-0000-0000-0000-000000000002' ||
    id === '10000000-0000-0000-0000-000000000003' ||
    id === '10000000-0000-0000-0000-000000000004' ||
    id === '10000000-0000-0000-0000-000000000005' ||
    id.startsWith('20000000-') ||
    id.startsWith('30000000-') ||
    id.startsWith('40000000-') ||
    id.startsWith('50000000-')
  );
};

const isMockUser = (u: any) => {
  if (!u) return false;
  if (u.email === 'karthik@time2trade.com') return false;
  if (u.email?.includes('capitalgrow.com')) return true;
  if (isMockId(u.id)) return true;
  if (MOCK_USER_NAMES.includes(u.name)) return true;
  return false;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useMocks = false;

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Presence and Attendance State
  const [presenceList, setPresenceList] = useState<UserPresence[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [traders, setTraders] = useState<ActiveTrader[]>([]);
  const [tradingDays, setTradingDays] = useState<TradingDay[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem('time2trade_notifications');
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (n) =>
              !MOCK_USER_NAMES.includes(n.user_name || '') &&
              !n.user_id?.startsWith('10000000-0000-0000-0000-00000000000')
          );
        }
      }
    } catch (e) {
      console.warn('Could not load stored notifications', e);
    }
    return [];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('time2trade_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.warn('Could not persist notifications', e);
    }
  }, [notifications]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'all',
    statusFilter: 'all',
  });

  // Current user's live presence
  const currentPresence = currentUser
    ? presenceList.find((p) => p.user_id === currentUser.id) || {
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_email: currentUser.email,
        user_role: currentUser.role,
        current_status: 'online' as UserPresenceStatus,
        last_status_change: new Date().toISOString(),
        today_login_time: new Date().toISOString(),
        total_break_minutes: 0,
        total_lunch_minutes: 0,
        is_late: false,
      }
    : null;

  const loadSupabaseData = async () => {
    if (!supabase) return;
    try {
      const [uRes, lRes, tRes, pRes, tdRes, expRes, allocRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('active_traders').select('*').order('joined_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('trading_days').select('*').order('trade_date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        Promise.resolve(supabase.from('payment_allocations').select('*').order('created_at', { ascending: true })).catch(() => ({ data: null })),
      ]);

      let userList = users;
      if (uRes.data) {
        userList = (uRes.data as User[]).filter((u) => !isMockUser(u));
        setUsers(userList);
      }
      if (lRes.data) {
        setLeads((lRes.data as Lead[]).filter((l) => !isMockId(l.id) && !isMockId(l.assigned_to)));
      }
      if (tRes.data) {
        setTraders(
          (tRes.data as any[])
            .filter((t) => !isMockId(t.id) && !isMockId(t.assigned_to) && !isMockId(t.lead_id))
            .map((t: any) => ({
              ...t,
              employee_id: t.assigned_to || t.employee_id,
            })) as ActiveTrader[]
        );
      }
      if (pRes.data) {
        const rawPayments = (pRes.data as Payment[]).filter(
          (p) => !isMockId(p.id) && !isMockId(p.trader_id) && !isMockId(p.employee_id)
        );
        const allocations = (allocRes?.data || []) as any[];

        const mappedPayments = rawPayments.map((p) => {
          const matchedAllocs = allocations.filter((a) => a.payment_id === p.id);
          const enrichedAllocs = matchedAllocs.map((a) => {
            const emp = userList.find((u) => u.id === a.employee_id);
            return {
              ...a,
              employee_name: emp?.name || a.employee_name || 'Staff',
              employee_email: emp?.email || a.employee_email,
              employee_code: emp?.employee_code || a.employee_code,
              employee_role: emp?.designation || (emp?.role === 'admin' ? 'Admin' : 'Employee'),
            };
          });

          return {
            ...p,
            allocations: enrichedAllocs.length > 0 ? enrichedAllocs : p.allocations,
            is_shared: (enrichedAllocs.length > 1) || p.is_shared,
          };
        });

        setPayments(mappedPayments);
      }
      if (tdRes.data) {
        setTradingDays(
          (tdRes.data as TradingDay[]).filter((td) => !isMockId(td.id) && !isMockId(td.trader_id))
        );
      }
      if (expRes.data) {
        setExpenses(
          (expRes.data as Expense[]).filter((exp) => !isMockId(exp.id))
        );
      }
    } catch {
      // Silently handle offline/mock mode
    }
  };

  // Check initial session
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              const userObj: User = {
                id: profile.id,
                name: profile.name || profile.full_name || session.user.email?.split('@')[0] || 'Staff',
                email: profile.email || session.user.email || '',
                role: profile.role as UserRole,
                is_active: profile.is_active,
                approval_status: profile.approval_status as ApprovalStatus,
                phone: profile.phone,
                avatar_url: profile.avatar_url,
                created_at: profile.created_at,
              };

              if (profile.is_active && profile.approval_status === 'approved') {
                setCurrentUser(userObj);
                await loadSupabaseData(); // Load all data for logged in user
                setLoading(false);
                return;
              }
            }
          }
        }

        // Check local persisted session
        const storedUser = localStorage.getItem('time2trade_auth_user');
        if (storedUser) {
          let parsed: User = JSON.parse(storedUser);
          
          // Migrate old roles
          if ((parsed.role as string) === 'telecaller' || (parsed.role as string) === 'relationship_manager') {
            parsed.role = 'employee';
            localStorage.setItem('time2trade_auth_user', JSON.stringify(parsed));
          }

          if (parsed && parsed.id && parsed.is_active && parsed.approval_status === 'approved') {
            setCurrentUser(parsed);
            if (supabase && !useMocks) await loadSupabaseData();
          } else {
            localStorage.removeItem('time2trade_auth_user');
          }
        }
      } catch {
        // Silent fallback to local stored session
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Fetch staff list from Supabase if connected
    if (supabase && !useMocks) {
      supabase.from('users').select('*').then(
        ({ data }) => {
          if (data && data.length > 0) {
            setUsers((prev) => {
              const map = new Map<string, User>();
              prev.forEach((u) => map.set(u.email.toLowerCase(), u));
              (data as User[]).filter((u) => !isMockUser(u)).forEach((u) => map.set(u.email.toLowerCase(), u));
              return Array.from(map.values());
            });
          }
        },
        () => {
          // Silent fallback
        }
      );
    }
  }, []);

  // Presence updater helper
  const updateUserPresence = (newStatus: UserPresenceStatus) => {
    if (!currentUser) return;

    const prevPresence = presenceList.find((p) => p.user_id === currentUser.id);
    const beforeStatus: UserPresenceStatus = prevPresence?.current_status || 'offline';
    const nowIso = new Date().toISOString();

    let eventType: AttendanceEventType = 'login';
    if (newStatus === 'on_break') eventType = 'break_start';
    else if (beforeStatus === 'on_break' && newStatus === 'online') eventType = 'break_end';
    else if (newStatus === 'on_lunch') eventType = 'lunch_start';
    else if (beforeStatus === 'on_lunch' && newStatus === 'online') eventType = 'lunch_end';
    else if (newStatus === 'offline') eventType = 'logout';

    // Calculate break/lunch delta
    let addedBreakMins = 0;
    let addedLunchMins = 0;
    if (prevPresence?.last_status_change) {
      const elapsedMins = Math.max(1, Math.round((Date.now() - new Date(prevPresence.last_status_change).getTime()) / 60000));
      if (beforeStatus === 'on_break') addedBreakMins = elapsedMins;
      if (beforeStatus === 'on_lunch') addedLunchMins = elapsedMins;
    }

    const updatedItem: UserPresence = {
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_email: currentUser.email,
      user_role: currentUser.role,
      current_status: newStatus,
      last_status_change: nowIso,
      today_login_time: prevPresence?.today_login_time || nowIso,
      today_logout_time: newStatus === 'offline' ? nowIso : prevPresence?.today_logout_time,
      total_break_minutes: (prevPresence?.total_break_minutes || 0) + addedBreakMins,
      total_lunch_minutes: (prevPresence?.total_lunch_minutes || 0) + addedLunchMins,
      is_late: prevPresence?.is_late || false,
    };

    setPresenceList((prev) => [
      updatedItem,
      ...prev.filter((p) => p.user_id !== currentUser.id),
    ]);

    const newLog: AttendanceLog = {
      id: `att-${Date.now()}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      event_type: eventType,
      event_time: nowIso,
      status_before: beforeStatus,
      status_after: newStatus,
    };

    setAttendanceLogs((prev) => [newLog, ...prev]);

    // Send to Supabase if configured
    if (supabase) {
      supabase.from('attendance_logs').insert({
        user_id: currentUser.id,
        event_type: eventType,
        status_before: beforeStatus,
        status_after: newStatus,
      }).then();

      supabase.from('user_presence').upsert({
        user_id: currentUser.id,
        current_status: newStatus,
        last_status_change: nowIso,
        today_login_time: updatedItem.today_login_time,
        today_logout_time: updatedItem.today_logout_time,
        total_break_minutes: updatedItem.total_break_minutes,
        total_lunch_minutes: updatedItem.total_lunch_minutes,
      }).then();
    }
  };

  // Sign up handler
  const signup = async (
    fullName: string,
    emailInput: string,
    passwordInput: string,
    phoneInput?: string
  ): Promise<AuthResponse> => {
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = emailInput.trim().toLowerCase();

      // Check if email already registered locally
      const existingUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existingUser) {
        setLoading(false);
        return {
          success: false,
          status: 'error',
          message: 'An account with this email address already exists. Please sign in instead.',
        };
      }

      let newUserId = generateUUID();

      // Supabase Signup
      if (supabase) {
        try {
          const { data: authData, error: sbError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: passwordInput,
            options: {
              data: {
                full_name: fullName.trim(),
                phone: phoneInput?.trim() || null,
              },
            },
          });

          if (sbError) {
            if (sbError.status === 429 || sbError.message?.toLowerCase().includes('rate limit')) {
              setLoading(false);
              return {
                success: false,
                status: 'error',
                message: 'Signup rate limit reached. Please wait a moment before trying again.',
              };
            }
            if (sbError.message?.toLowerCase().includes('already registered')) {
              setLoading(false);
              return {
                success: false,
                status: 'error',
                message: 'An account with this email address already exists. Please sign in instead.',
              };
            }
            console.warn('Supabase auth signup notice:', sbError.message);
          }

          if (authData?.user) {
            newUserId = authData.user.id;
          }

          // Persist user record to public.users table so administrator can review and approve
          const { error: upsertErr } = await supabase.from('users').upsert({
            id: newUserId,
            name: fullName.trim(),
            email: normalizedEmail,
            phone: phoneInput?.trim() || null,
            role: 'employee',
            is_active: false,
            approval_status: 'pending_admin_review',
          });

          if (upsertErr) {
            console.warn('Could not sync user profile to public.users:', upsertErr.message);
          }
        } catch (sbErr) {
          console.error('Supabase signup error:', sbErr);
        }
      }

      const newPendingUser: User = {
        id: newUserId,
        name: fullName.trim(),
        email: normalizedEmail,
        phone: phoneInput?.trim() || undefined,
        role: 'employee',
        is_active: false,
        approval_status: 'pending_admin_review',
        created_at: new Date().toISOString(),
      };

      setUsers((prev) => [newPendingUser, ...prev]);

      // Add to presence list as offline
      setPresenceList((prev) => [
        {
          user_id: newUserId,
          user_name: newPendingUser.name,
          user_email: newPendingUser.email,
          user_role: 'employee',
          current_status: 'offline',
          last_status_change: new Date().toISOString(),
          total_break_minutes: 0,
          total_lunch_minutes: 0,
        },
        ...prev,
      ]);

      // Add audit log
      const auditEntry: AuditLog = {
        id: `aud-${Date.now()}`,
        user_id: newUserId,
        user_name: fullName.trim(),
        action: 'EMPLOYEE_SIGNUP_SUBMITTED',
        table_name: 'users',
        record_id: newUserId,
        new_values: { email: normalizedEmail, approval_status: 'pending_admin_review' },
        created_at: new Date().toISOString(),
      };
      setAuditLogs((prev) => [auditEntry, ...prev]);

      setLoading(false);
      return {
        success: true,
        status: 'pending',
        message: 'Your registration was received and submitted for administrative approval.',
      };
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        status: 'error',
        message: err?.message || 'Failed to submit registration. Please try again.',
      };
    }
  };

  // Login handler
  const login = async (emailInput: string, passwordInput: string): Promise<AuthResponse> => {
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = emailInput.trim().toLowerCase();
      let authenticatedUser: User | null = null;

      let lastAuthError: string | null = null;

      // 1. Authenticate with Supabase Auth using the user's actual signup password
      if (supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: passwordInput,
          });

          if (authError) {
            lastAuthError = authError.message;
          }

          if (!authError && authData?.user) {
            // Fetch user profile from public.users table (contains role: admin / employee)
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (profile) {
              authenticatedUser = {
                id: profile.id,
                name: profile.name || profile.full_name || authData.user.email?.split('@')[0] || 'Staff',
                email: profile.email || authData.user.email || '',
                phone: profile.phone,
                role: profile.role as UserRole,
                is_active: profile.is_active !== false,
                approval_status: (profile.approval_status || 'approved') as ApprovalStatus,
                avatar_url: profile.avatar_url,
                created_at: profile.created_at || new Date().toISOString(),
              };
            } else {
              // Fallback if profile row is not yet found
              authenticatedUser = {
                id: authData.user.id,
                name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
                email: authData.user.email || normalizedEmail,
                phone: authData.user.user_metadata?.phone,
                role: 'admin' as UserRole,
                is_active: true,
                approval_status: 'approved',
                created_at: authData.user.created_at || new Date().toISOString(),
              };
            }
          }
        } catch (sbErr: any) {
          lastAuthError = sbErr?.message || null;
        }
      }

      // 2. Fallback ONLY for the initial mock seed admin (karthik@time2trade.com)
      // which was inserted directly in SQL schema without a Supabase Auth account
      if (!authenticatedUser && normalizedEmail === 'karthik@time2trade.com' && passwordInput === 'Time2trade@2026') {
        const foundAdmin = users.find((u) => u.email.toLowerCase() === 'karthik@time2trade.com');
        authenticatedUser = {
          id: foundAdmin?.id || 'admin-karthik',
          name: foundAdmin?.name || 'Karthik Muni',
          email: 'karthik@time2trade.com',
          role: 'admin',
          is_active: true,
          approval_status: 'approved',
          created_at: foundAdmin?.created_at || new Date().toISOString(),
        };
      }

      // 3. If not authenticated, check if user exists in state/DB to give informative error feedback
      if (!authenticatedUser) {
        const foundStaff = users.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (foundStaff) {
          if (foundStaff.approval_status === 'pending_admin_review' || foundStaff.role === 'pending') {
            setLoading(false);
            return {
              success: false,
              status: 'pending',
              message: 'Your account is under administrative review. Access will be unlocked once an administrator assigns your role.',
            };
          }
          if (foundStaff.approval_status === 'rejected') {
            setLoading(false);
            return {
              success: false,
              status: 'rejected',
              message: `Your account application was rejected. Reason: ${foundStaff.rejection_reason || 'Compliance check failure.'}`,
            };
          }
          if (foundStaff.is_active === false) {
            setLoading(false);
            return {
              success: false,
              status: 'disabled',
              message: 'Your account has been deactivated. Please contact an administrator.',
            };
          }
        }

        setLoading(false);
        return {
          success: false,
          status: 'error',
          message: lastAuthError || 'Invalid email or password. Please verify your credentials.',
        };
      }

      // 3. Verify Account Status & Approvals
      if (authenticatedUser.is_active === false) {
        if (supabase) await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return {
          success: false,
          status: 'disabled',
          message: 'Your account has been deactivated. Please contact an administrator.',
        };
      }

      if (authenticatedUser.approval_status === 'pending_admin_review' || authenticatedUser.role === 'pending') {
        if (supabase) await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return {
          success: false,
          status: 'pending',
          message: 'Your account is under administrative review. Access will be unlocked once an administrator assigns your role.',
        };
      }

      if (authenticatedUser.approval_status === 'rejected') {
        if (supabase) await supabase.auth.signOut().catch(() => {});
        setLoading(false);
        return {
          success: false,
          status: 'rejected',
          message: `Your account application was rejected. Reason: ${authenticatedUser.rejection_reason || 'Compliance check failure.'}`,
        };
      }

      // 4. Successful Authentication
      setCurrentUser(authenticatedUser);
      localStorage.setItem('time2trade_auth_user', JSON.stringify(authenticatedUser));
      if (supabase && !useMocks) {
        await loadSupabaseData();
      }

      // 5. Record Login Event & Update Presence
      const nowIso = new Date().toISOString();
      const loginLog: AttendanceLog = {
        id: `att-${Date.now()}`,
        user_id: authenticatedUser.id,
        user_name: authenticatedUser.name,
        user_role: authenticatedUser.role,
        event_type: 'login',
        event_time: nowIso,
        status_before: 'offline',
        status_after: 'online',
      };
      setAttendanceLogs((prev) => [loginLog, ...prev]);

      const prevP = presenceList.find((p) => p.user_id === authenticatedUser!.id);
      const isLate = new Date().getHours() >= 10;

      setPresenceList((prev) => [
        {
          user_id: authenticatedUser!.id,
          user_name: authenticatedUser!.name,
          user_email: authenticatedUser!.email,
          user_role: authenticatedUser!.role,
          current_status: 'online',
          last_status_change: nowIso,
          today_login_time: prevP?.today_login_time || nowIso,
          today_logout_time: undefined,
          total_break_minutes: prevP?.total_break_minutes || 0,
          total_lunch_minutes: prevP?.total_lunch_minutes || 0,
          is_late: isLate,
        },
        ...prev.filter((p) => p.user_id !== authenticatedUser!.id),
      ]);

      setLoading(false);
      return {
        success: true,
        status: 'approved',
        message: 'Authentication successful.',
      };
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
      setLoading(false);
      return {
        success: false,
        status: 'error',
        message: err?.message || 'Sign in error.',
      };
    }
  };

  // Logout handler
  const logout = async () => {
    if (currentUser) {
      const nowIso = new Date().toISOString();
      const logoutLog: AttendanceLog = {
        id: `att-${Date.now()}`,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        event_type: 'logout',
        event_time: nowIso,
        status_before: currentPresence?.current_status || 'online',
        status_after: 'offline',
      };
      setAttendanceLogs((prev) => [logoutLog, ...prev]);

      setPresenceList((prev) => [
        {
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_email: currentUser.email,
          user_role: currentUser.role,
          current_status: 'offline',
          last_status_change: nowIso,
          today_login_time: currentPresence?.today_login_time,
          today_logout_time: nowIso,
          total_break_minutes: currentPresence?.total_break_minutes || 0,
          total_lunch_minutes: currentPresence?.total_lunch_minutes || 0,
          is_late: currentPresence?.is_late || false,
        },
        ...prev.filter((p) => p.user_id !== currentUser.id),
      ]);
    }

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Silent signout
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('time2trade_auth_user');
    }
  };

  // Admin Action: Assign Role and Approve Employee
  const assignRoleAndApprove = async (userId: string, assignedRole: UserRole) => {
    const nowIso = new Date().toISOString();
    const adminId = currentUser?.id || 'admin-system';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: assignedRole,
              is_active: true,
              approval_status: 'approved',
              approved_by: adminId,
              approved_at: nowIso,
              updated_at: nowIso,
            }
          : u
      )
    );

    // Update presence
    setPresenceList((prev) =>
      prev.map((p) =>
        p.user_id === userId ? { ...p, user_role: assignedRole } : p
      )
    );

    // Audit log
    const targetUser = users.find((u) => u.id === userId);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        user_id: adminId,
        user_name: currentUser?.name || 'Admin',
        action: 'APPROVE_EMPLOYEE_AND_ASSIGN_ROLE',
        table_name: 'users',
        record_id: userId,
        old_values: { role: targetUser?.role, approval_status: targetUser?.approval_status },
        new_values: { role: assignedRole, approval_status: 'approved', is_active: true },
        created_at: nowIso,
      },
      ...prev,
    ]);

    if (supabase) {
      await supabase
        .from('users')
        .update({
          role: assignedRole,
          is_active: true,
          approval_status: 'approved',
          approved_by: adminId,
          approved_at: nowIso,
        })
        .eq('id', userId);
    }

    // Send account approved notification to employee
    const approvedNotif: NotificationItem = {
      id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
      user_id: userId,
      user_name: targetUser?.name,
      title: '🎉 Account Approved!',
      message: `Your account registration was approved by Admin. Your role is set to ${assignedRole}. Welcome to Time2Trade CRM!`,
      type: 'success',
      category: 'system',
      action_tab: assignedRole === 'admin' ? 'dashboard' : 'employee-dashboard',
      action_label: 'Access Dashboard',
      is_read: false,
      created_at: nowIso,
    };
    setNotifications((prev) => [approvedNotif, ...prev]);
  };

  // Admin Action: Reject Employee Application
  const rejectEmployee = async (userId: string, reason: string) => {
    const nowIso = new Date().toISOString();
    const adminId = currentUser?.id || 'admin-system';
    const targetUser = users.find((u) => u.id === userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              is_active: false,
              approval_status: 'rejected',
              rejection_reason: reason,
              updated_at: nowIso,
            }
          : u
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        user_id: adminId,
        user_name: currentUser?.name || 'Admin',
        action: 'REJECT_EMPLOYEE_REGISTRATION',
        table_name: 'users',
        record_id: userId,
        new_values: { approval_status: 'rejected', rejection_reason: reason },
        created_at: nowIso,
      },
      ...prev,
    ]);

    if (supabase) {
      await supabase
        .from('users')
        .update({
          is_active: false,
          approval_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', userId);
    }

    // Send rejection notification
    const rejectNotif: NotificationItem = {
      id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
      user_id: userId,
      user_name: targetUser?.name,
      title: 'Account Application Update',
      message: `Your account application was reviewed: ${reason}`,
      type: 'danger',
      category: 'system',
      is_read: false,
      created_at: nowIso,
    };
    setNotifications((prev) => [rejectNotif, ...prev]);
  };

  // Admin Action: Toggle Active/Inactive
  const toggleEmployeeActive = async (userId: string, isActive: boolean) => {
    const nowIso = new Date().toISOString();
    const adminId = currentUser?.id || 'admin-system';

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              is_active: isActive,
              updated_at: nowIso,
            }
          : u
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        user_id: adminId,
        user_name: currentUser?.name || 'Admin',
        action: isActive ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
        table_name: 'users',
        record_id: userId,
        new_values: { is_active: isActive },
        created_at: nowIso,
      },
      ...prev,
    ]);

    if (supabase) {
      await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const setDateFilter = (df: DateFilter) => {
    setFilters((prev) => ({ ...prev, dateFilter: df }));
  };

  const updateUserAvatar = async (url: string) => {
    if (!currentUser) return;
    
    // Optimistic UI Update
    setCurrentUser(prev => prev ? { ...prev, avatar_url: url } : null);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, avatar_url: url } : u));
    
    // Persist to local storage so it survives refresh
    const storedUser = localStorage.getItem('time2trade_auth_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('time2trade_auth_user', JSON.stringify({ ...parsed, avatar_url: url }));
    }

    if (supabase && !useMocks) {
      await supabase.from('users').update({ avatar_url: url }).eq('id', currentUser.id);
    }
  };

  const addLead = async (leadInput: Omit<Lead, 'id' | 'created_at'>) => {
    const newId = generateUUID();
    const assignedUser = users.find((u) => u.id === leadInput.assigned_to);

    // Sanitize PostgreSQL check constraint values & UUID format
    const validTradingExp =
      leadInput.trading_experience && ['beginner', 'intermediate', 'advanced'].includes(leadInput.trading_experience)
        ? leadInput.trading_experience
        : undefined;

    const isValidUUID = (id?: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

    const validAssignedTo = isValidUUID(leadInput.assigned_to) ? leadInput.assigned_to : undefined;

    const newLead: Lead = {
      ...leadInput,
      id: newId,
      assigned_to: validAssignedTo,
      trading_experience: validTradingExp,
      assigned_to_name: assignedUser?.name,
      created_at: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setLeads((prev) => [newLead, ...prev]);

    // Send notification to assigned staff member
    if (validAssignedTo) {
      const assignedNotif: NotificationItem = {
        id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
        user_id: validAssignedTo,
        user_name: assignedUser?.name,
        title: '📋 New Lead Assigned',
        message: `Lead "${leadInput.name}" (${leadInput.phone}) has been assigned to you.`,
        type: 'info',
        category: 'leads',
        action_tab: 'employee-dashboard',
        action_label: 'View Desk',
        client_name: leadInput.name,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [assignedNotif, ...prev]);
    }

    if (supabase && !useMocks) {
      const { error } = await supabase.from('leads').insert({
        id: newId,
        name: leadInput.name.trim(),
        phone: leadInput.phone.trim(),
        source: leadInput.source || 'Meta Ads',
        assigned_to: validAssignedTo || null,
        status: leadInput.status || 'new',
        investment_capacity: leadInput.investment_capacity?.trim() || null,
        trading_experience: validTradingExp || null,
        preferred_market: leadInput.preferred_market?.trim() || null,
        next_follow_up_at: leadInput.next_follow_up_at || null,
        notes: leadInput.notes?.trim() || null,
      });

      if (error) {
        console.error('Supabase Insert Error Details:', JSON.stringify(error, null, 2));
        // Revert optimistic update
        setLeads((prev) => prev.filter((l) => l.id !== newId));
        throw new Error(`DB Error: ${error.message} (Code: ${error.code})`);
      }
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...updates, updated_at: new Date().toISOString() } : l))
    );

    if (supabase && !useMocks) {
      // Exclude UI-only derived fields from supabase update
      const dbUpdates = { ...updates };
      delete (dbUpdates as any).assigned_to_name;
      await supabase.from('leads').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', leadId);
    }
  };

  const handoffLead = async (
    leadId: string,
    qualification: {
      investment_capacity: string;
      trading_experience: Lead['trading_experience'];
      preferred_market: string;
      employee_notes?: string;
      assigned_to?: string;
    }
  ) => {
    const rms = users.filter((u) => u.role === 'employee' && u.is_active);
    const selectedRMId = qualification.assigned_to || rms[0]?.id;
    const selectedRMObj = users.find((u) => u.id === selectedRMId);
    const now = new Date().toISOString();

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'interested',
              investment_capacity: qualification.investment_capacity,
              trading_experience: qualification.trading_experience,
              preferred_market: qualification.preferred_market,
              employee_notes: qualification.employee_notes,
              assigned_to: selectedRMId,
              assigned_to_name: selectedRMObj?.name,
              updated_at: now,
            }
          : l
      )
    );

    if (supabase && !useMocks) {
      await supabase.from('leads').update({
        status: 'interested',
        investment_capacity: qualification.investment_capacity,
        trading_experience: qualification.trading_experience,
        preferred_market: qualification.preferred_market,
        
        assigned_to: selectedRMId,
        updated_at: now,
      }).eq('id', leadId);
    }

    if (selectedRMId) {
      const targetLead = leads.find((l) => l.id === leadId);
      const rmUser = users.find((u) => u.id === selectedRMId);
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
        user_id: selectedRMId,
        user_name: rmUser?.name,
        title: '🎯 New Lead Handoff Assigned',
        message: `${targetLead?.name || 'Lead'} interested in RM call (${qualification.preferred_market || 'Equity/Commodity'})`,
        type: 'info',
        category: 'leads',
        action_tab: 'employee-dashboard',
        action_label: 'View Desk',
        client_name: targetLead?.name,
        is_read: false,
        link_path: '/rm-leads',
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const convertLeadToTrader = async (
    leadId: string, 
    rmId: string,
    details?: { initialCapital: number; selectedService: string; preferredMarket: string }
  ) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    const rmObj = users.find((u) => u.id === rmId);
    const traderId = generateUUID();
    const now = new Date().toISOString();

    const newTrader: ActiveTrader = {
      id: traderId,
      lead_id: leadId,
      name: targetLead.name,
      phone: targetLead.phone,
      employee_id: rmId,
      employee_name: rmObj?.name || 'RM',
      status: 'active',
      joined_at: now.split('T')[0],
      initial_capital: details?.initialCapital,
      selected_service: details?.selectedService,
      preferred_market: details?.preferredMarket,
      current_streak: 0,
      longest_streak: 0,
      total_profit_gained: 0,
      total_profit_shared: 0,
      created_at: now,
    };

    setTraders((prev) => [newTrader, ...prev]);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: 'active_trader', updated_at: now }
          : l
      )
    );

    if (supabase && !useMocks) {
      await Promise.all([
        supabase.from('active_traders').insert({
          id: traderId,
          lead_id: leadId,
          name: targetLead.name,
          phone: targetLead.phone,
          assigned_to: rmId,
          status: 'active',
          joined_at: now.split('T')[0],
          initial_capital: details?.initialCapital,
          selected_service: details?.selectedService,
          preferred_market: details?.preferredMarket,
          current_streak: 0,
          longest_streak: 0,
          total_profit_gained: 0,
          total_profit_shared: 0,
        }),
        supabase.from('leads').update({
          status: 'active_trader',
          updated_at: now,
        }).eq('id', leadId),
      ]);
    }

    // Send notification to RM
    if (rmId) {
      const rmNotif: NotificationItem = {
        id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
        user_id: rmId,
        user_name: rmObj?.name,
        title: '🚀 Trader Converted!',
        message: `${targetLead.name} was successfully converted to an active trader under your desk.`,
        type: 'success',
        category: 'leads',
        action_tab: 'employee-dashboard',
        action_label: 'View Traders',
        client_name: targetLead.name,
        is_read: false,
        created_at: now,
      };
      setNotifications((prev) => [rmNotif, ...prev]);
    }
  };

  const addTradingDay = async (traderId: string, tradeDate: string, totalProfit: number, tradesCount: number) => {
    const newTdId = generateUUID();
    const isWinning = totalProfit > 0;
    const now = new Date().toISOString();
    const newTd: TradingDay = {
      id: newTdId,
      trader_id: traderId,
      trade_date: tradeDate,
      total_profit: totalProfit,
      trades_count: tradesCount,
      is_winning_day: isWinning,
      created_at: now,
    };

    const updatedTradingDays = [newTd, ...tradingDays.filter((d) => !(d.trader_id === traderId && d.trade_date === tradeDate))];
    setTradingDays(updatedTradingDays);

    const traderDays = updatedTradingDays.filter((d) => d.trader_id === traderId);
    const { currentStreak, longestStreak } = calculateTraderStreak(traderDays);
    const totalGained = traderDays.reduce((sum, d) => sum + Number(d.total_profit), 0);

    setTraders((prev) =>
      prev.map((t) =>
        t.id === traderId
          ? {
              ...t,
              current_streak: currentStreak,
              longest_streak: Math.max(t.longest_streak, longestStreak),
              total_profit_gained: totalGained,
              last_trade_date: tradeDate,
              updated_at: now,
            }
          : t
      )
    );

    if (supabase && !useMocks) {
      try {
        await supabase.from('trading_days').upsert({
          id: newTdId,
          trader_id: traderId,
          trade_date: tradeDate,
          total_profit: totalProfit,
          trades_count: tradesCount,
          is_winning_day: isWinning,
        }, { onConflict: 'trader_id,trade_date' });

        await supabase.from('active_traders').update({
          current_streak: currentStreak,
          longest_streak: Math.max(longestStreak),
          total_profit_gained: totalGained,
          last_trade_date: tradeDate,
          updated_at: now,
        }).eq('id', traderId);
      } catch (err) {
        console.error('Error syncing trading day to Supabase:', err);
      }
    }
  };

  const addPayment = async (paymentInput: Omit<Payment, 'id' | 'created_at' | 'status'>) => {
    const isValidUUID = (id?: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

    let targetTraderId = paymentInput.trader_id;
    let targetTrader = traders.find((t) => t.id === targetTraderId);

    // If trader_id is not a valid UUID (e.g. 'manual-client', empty string, or new prospect)
    if (!isValidUUID(targetTraderId) || targetTraderId === 'manual-client') {
      const clientName = (paymentInput as any).trader_name || 'Direct Client';
      const clientPhone = (paymentInput as any).trader_phone || '+91 98765 43210';

      const existing = traders.find(
        (t) => t.phone === clientPhone || (t.name && t.name.toLowerCase() === clientName.toLowerCase())
      );

      if (existing && isValidUUID(existing.id)) {
        targetTraderId = existing.id;
        targetTrader = existing;
      } else {
        // Auto-create active trader record in Supabase so foreign key is satisfied
        const newTraderId = generateUUID();
        const effectiveAssignedTo = isValidUUID(paymentInput.employee_id)
          ? paymentInput.employee_id
          : currentUser && isValidUUID(currentUser.id)
          ? currentUser.id
          : '10000000-0000-0000-0000-000000000001';

        const newTrader: ActiveTrader = {
          id: newTraderId,
          name: clientName,
          phone: clientPhone,
          employee_id: effectiveAssignedTo!,
          status: 'active',
          joined_at: new Date().toISOString().split('T')[0],
          current_streak: 0,
          longest_streak: 0,
          total_profit_gained: 0,
          total_profit_shared: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTraders((prev) => [newTrader, ...prev]);

        if (supabase && !useMocks) {
          try {
            await supabase.from('active_traders').insert({
              id: newTraderId,
              name: clientName,
              phone: clientPhone,
              assigned_to: effectiveAssignedTo,
              status: 'active',
              joined_at: newTrader.joined_at,
            });
          } catch (tErr) {
            console.warn('Could not auto-register trader for payment:', tErr);
          }
        }

        targetTraderId = newTraderId;
        targetTrader = newTrader;
      }
    }

    const newPayId = generateUUID();
    const effectiveEmployeeId = isValidUUID(paymentInput.employee_id)
      ? paymentInput.employee_id
      : currentUser && isValidUUID(currentUser.id)
      ? currentUser.id
      : null;

    const rawAllocations = paymentInput.allocations || [];
    const enrichedAllocations: PaymentAllocation[] = rawAllocations.map((alloc) => {
      const emp = users.find((u) => u.id === alloc.employee_id);
      return {
        ...alloc,
        id: alloc.id || generateUUID(),
        payment_id: newPayId,
        employee_name: emp?.name || alloc.employee_name || 'Staff',
        employee_email: emp?.email || alloc.employee_email,
        employee_code: emp?.employee_code || alloc.employee_code,
        employee_role: emp?.designation || (emp?.role === 'admin' ? 'Admin' : 'Employee'),
        allocation_percentage:
          alloc.allocation_percentage ||
          Number(((alloc.allocation_amount / paymentInput.amount) * 100).toFixed(2)),
      };
    });

    const isSharedPayment = enrichedAllocations.length > 1 || Boolean(paymentInput.is_shared);

    const newPayment: Payment = {
      ...paymentInput,
      id: newPayId,
      trader_id: targetTraderId,
      trader_name: targetTrader?.name || (paymentInput as any).trader_name || 'Trader',
      trader_phone: targetTrader?.phone || (paymentInput as any).trader_phone,
      employee_id: effectiveEmployeeId || 'sys',
      employee_name: currentUser?.name || 'Staff',
      submitted_by_employee_id: currentUser?.id || effectiveEmployeeId || undefined,
      submitted_by_employee_name: currentUser?.name || 'Staff',
      status: 'pending_verification',
      is_shared: isSharedPayment,
      allocations: enrichedAllocations.length > 0 ? enrichedAllocations : undefined,
      created_at: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    if (supabase && !useMocks) {
      try {
        const payload: Record<string, any> = {
          id: newPayId,
          trader_id: targetTraderId,
          employee_id: effectiveEmployeeId,
          amount: paymentInput.amount,
          payment_mode: paymentInput.payment_mode,
          utr: paymentInput.utr,
          transaction_time: paymentInput.transaction_time,
          screenshot_url: paymentInput.screenshot_url,
          status: 'pending_verification',
        };

        if (paymentInput.service_category) payload.service_category = paymentInput.service_category;
        if (paymentInput.service_type) payload.service_type = paymentInput.service_type;
        if (paymentInput.subscription_duration) payload.subscription_duration = paymentInput.subscription_duration;
        if (paymentInput.receiver_bank_name) payload.receiver_bank_name = paymentInput.receiver_bank_name;
        if (paymentInput.remarks) payload.remarks = paymentInput.remarks;
        if (currentUser?.id) payload.submitted_by_employee_id = currentUser.id;
        payload.is_shared = isSharedPayment;

        const { error } = await supabase.from('payments').insert(payload);

        if (error) {
          console.warn('Supabase extended payment insert notice, falling back to base columns:', error.message);
          // Fallback to basic columns if migration columns aren't added yet
          await supabase.from('payments').insert({
            id: newPayId,
            trader_id: targetTraderId,
            employee_id: effectiveEmployeeId,
            amount: paymentInput.amount,
            payment_mode: paymentInput.payment_mode,
            utr: paymentInput.utr,
            transaction_time: paymentInput.transaction_time,
            screenshot_url: paymentInput.screenshot_url,
            status: 'pending_verification',
          });
        }

        // Insert allocations if provided
        if (enrichedAllocations.length > 0) {
          const allocationRecords = enrichedAllocations.map((a) => ({
            id: a.id,
            payment_id: newPayId,
            employee_id: a.employee_id,
            allocation_amount: a.allocation_amount,
            allocation_percentage: a.allocation_percentage,
            is_primary: Boolean(a.is_primary),
          }));

          const { error: allocErr } = await supabase.from('payment_allocations').insert(allocationRecords);
          if (allocErr) {
            console.warn('Could not insert to payment_allocations table:', allocErr.message);
          }
        }
      } catch (err) {
        console.error('Network error inserting payment:', err);
      }
    }

    const now = new Date().toISOString();
    const newNotifs: NotificationItem[] = [];

    // 1. Admin Verification Notification
    const adminUser = users.find((u) => u.role === 'admin');
    if (adminUser) {
      newNotifs.push({
        id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
        user_id: adminUser.id,
        user_name: adminUser.name,
        title: 'New Payment Verification Required',
        message: `${newPayment.trader_name} submitted ₹${Number(newPayment.amount).toLocaleString('en-IN')} (UTR: ${newPayment.utr})`,
        type: 'warning',
        category: 'sales',
        action_tab: 'payment-verification',
        action_label: 'Verify Payment',
        amount: Number(newPayment.amount),
        client_name: newPayment.trader_name,
        is_read: false,
        link_path: '/verification',
        created_at: now,
      });
    }

    // 2. Primary Employee Submission Notification
    const primaryAlloc = enrichedAllocations.find((a) => a.is_primary);
    const primaryEmp = users.find(
      (u) => u.id === newPayment.employee_id || u.id === primaryAlloc?.employee_id || u.name === newPayment.employee_name
    );
    if (primaryEmp) {
      const primaryShareAmt = primaryAlloc ? primaryAlloc.allocation_amount : newPayment.amount;
      const primaryPct = primaryAlloc ? primaryAlloc.allocation_percentage : 100;
      newNotifs.push({
        id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
        user_id: primaryEmp.id,
        user_name: primaryEmp.name,
        title: 'Payment Submitted for Verification',
        message: `Payment of ₹${Number(newPayment.amount).toLocaleString('en-IN')} for client ${newPayment.trader_name} submitted to Admin. Your share: ₹${Number(primaryShareAmt).toLocaleString('en-IN')} (${primaryPct}%).`,
        type: 'info',
        category: 'sales',
        action_tab: 'employee-dashboard',
        action_label: 'View Sales',
        amount: Number(primaryShareAmt),
        share_percentage: primaryPct,
        client_name: newPayment.trader_name,
        is_read: false,
        created_at: now,
      });
    }

    // 3. Shared Staff Allocation Notifications
    const sharedAllocs = enrichedAllocations.filter((a) => !a.is_primary);
    sharedAllocs.forEach((a) => {
      const staffMember = users.find((u) => u.id === a.employee_id || u.name === a.employee_name);
      if (staffMember) {
        newNotifs.push({
          id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
          user_id: staffMember.id,
          user_name: staffMember.name,
          title: `💰 Sales Credit Allocated: ₹${Number(a.allocation_amount).toLocaleString('en-IN')}`,
          message: `You have been allocated a ${a.allocation_percentage}% profit share (₹${Number(a.allocation_amount).toLocaleString('en-IN')}) for client ${newPayment.trader_name} by ${newPayment.employee_name || 'Team'}. Status: Pending Verification.`,
          type: 'success',
          category: 'sales',
          action_tab: 'employee-dashboard',
          action_label: 'View Credit',
          amount: Number(a.allocation_amount),
          share_percentage: Number(a.allocation_percentage),
          client_name: newPayment.trader_name,
          is_read: false,
          created_at: now,
        });
      }
    });

    if (newNotifs.length > 0) {
      setNotifications((prev) => [...newNotifs, ...prev]);
    }
  };

  const verifyPayment = async (paymentId: string, isApproved: boolean, remarks?: string) => {
    const targetPayment = payments.find((p) => p.id === paymentId);
    if (!targetPayment) return;

    const newStatus: PaymentStatus = isApproved ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: newStatus,
              admin_remarks: remarks,
              verified_at: now,
            }
          : p
      )
    );

    const traderId = targetPayment.trader_id;
    let totalShared = 0;

    if (isApproved) {
      const traderApprovedPayments = [
        ...payments.filter((p) => p.trader_id === traderId && p.id !== paymentId && p.status === 'approved'),
        { ...targetPayment, status: 'approved' as const },
      ];
      totalShared = traderApprovedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      setTraders((prev) =>
        prev.map((t) => (t.id === traderId ? { ...t, total_profit_shared: totalShared, updated_at: now } : t))
      );
    }
      
    if (supabase && !useMocks) {
      if (isApproved) {
        await Promise.all([
          supabase.from('payments').update({ status: newStatus, admin_remarks: remarks, verified_at: now }).eq('id', paymentId),
          supabase.from('active_traders').update({ total_profit_shared: totalShared, updated_at: now }).eq('id', traderId),
        ]);
      } else {
        await supabase.from('payments').update({ status: newStatus, admin_remarks: remarks, verified_at: now }).eq('id', paymentId);
      }
    }

    // Per-Employee Verification Notifications (Approved / Rejected)
    const primaryEmp = users.find(
      (u) => u.id === targetPayment.employee_id || u.name === targetPayment.employee_name
    );
    const allocs = targetPayment.allocations || [];
    const verifyNotifs: NotificationItem[] = [];

    if (isApproved) {
      if (primaryEmp) {
        const primaryAlloc = allocs.find((a) => a.is_primary);
        const myAmount = primaryAlloc ? primaryAlloc.allocation_amount : targetPayment.amount;
        verifyNotifs.push({
          id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
          user_id: primaryEmp.id,
          user_name: primaryEmp.name,
          title: `✅ Payment Approved: ₹${Number(targetPayment.amount).toLocaleString('en-IN')}`,
          message: `Admin approved the payment for client ${targetPayment.trader_name}. Your credit of ₹${Number(myAmount).toLocaleString('en-IN')} is confirmed!`,
          type: 'success',
          category: 'sales',
          action_tab: 'employee-dashboard',
          action_label: 'View Sales',
          amount: Number(myAmount),
          client_name: targetPayment.trader_name,
          is_read: false,
          created_at: now,
        });
      }

      allocs.filter((a) => !a.is_primary).forEach((a) => {
        const staff = users.find((u) => u.id === a.employee_id || u.name === a.employee_name);
        if (staff) {
          verifyNotifs.push({
            id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
            user_id: staff.id,
            user_name: staff.name,
            title: `🎉 Sales Credit Confirmed: ₹${Number(a.allocation_amount).toLocaleString('en-IN')}`,
            message: `Your ${a.allocation_percentage}% profit share (₹${Number(a.allocation_amount).toLocaleString('en-IN')}) for client ${targetPayment.trader_name} has been verified and confirmed.`,
            type: 'success',
            category: 'sales',
            action_tab: 'employee-dashboard',
            action_label: 'View Credit',
            amount: Number(a.allocation_amount),
            share_percentage: Number(a.allocation_percentage),
            client_name: targetPayment.trader_name,
            is_read: false,
            created_at: now,
          });
        }
      });
    } else {
      if (primaryEmp) {
        verifyNotifs.push({
          id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
          user_id: primaryEmp.id,
          user_name: primaryEmp.name,
          title: `❌ Payment Rejected: ₹${Number(targetPayment.amount).toLocaleString('en-IN')}`,
          message: `Payment for client ${targetPayment.trader_name} was rejected by Admin.${remarks ? ` Reason: ${remarks}` : ''}`,
          type: 'danger',
          category: 'sales',
          action_tab: 'employee-dashboard',
          action_label: 'View Desk',
          amount: Number(targetPayment.amount),
          client_name: targetPayment.trader_name,
          is_read: false,
          created_at: now,
        });
      }

      allocs.filter((a) => !a.is_primary).forEach((a) => {
        const staff = users.find((u) => u.id === a.employee_id || u.name === a.employee_name);
        if (staff) {
          verifyNotifs.push({
            id: `notif-${Date.now()}-${generateUUID().slice(0, 4)}`,
            user_id: staff.id,
            user_name: staff.name,
            title: `⚠️ Allocation Cancelled`,
            message: `Payment of ₹${Number(targetPayment.amount).toLocaleString('en-IN')} for ${targetPayment.trader_name} was rejected by Admin.${remarks ? ` Reason: ${remarks}` : ''}`,
            type: 'warning',
            category: 'sales',
            action_tab: 'employee-dashboard',
            action_label: 'View Desk',
            client_name: targetPayment.trader_name,
            is_read: false,
            created_at: now,
          });
        }
      });
    }

    if (verifyNotifs.length > 0) {
      setNotifications((prev) => [...verifyNotifs, ...prev]);
    }
  };

  const addExpense = async (expenseInput: Omit<Expense, 'id' | 'created_at'>) => {
    const newExpId = generateUUID();
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expenseInput,
      id: newExpId,
      added_by: currentUser?.id,
      added_by_name: currentUser?.name || 'Staff',
      created_at: now,
    };
    setExpenses((prev) => [newExpense, ...prev]);

    if (supabase && !useMocks) {
      try {
        await supabase.from('expenses').insert({
          id: newExpId,
          date: expenseInput.date,
          category: expenseInput.category,
          amount: expenseInput.amount,
          description: expenseInput.description,
          added_by: currentUser?.id || null,
          receipt_url: expenseInput.receipt_url || null,
        });
      } catch (err) {
        console.error('Error syncing expense to Supabase:', err);
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllNotificationsRead = (userId?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (!userId || n.user_id === userId ? { ...n, is_read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = (userId?: string) => {
    setNotifications((prev) => (userId ? prev.filter((n) => n.user_id !== userId) : []));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loading,
        error,
        signup,
        login,
        logout,
        currentPresence,
        presenceList,
        attendanceLogs,
        updateUserPresence,
        assignRoleAndApprove,
        rejectEmployee,
        toggleEmployeeActive,
        leads,
        traders,
        tradingDays,
        payments,
        expenses,
        notifications,
        auditLogs,
        filters,
        setFilters,
        setDateFilter,
        addLead,
        updateLead,
        handoffLead,
        convertLeadToTrader,
        addTradingDay,
        addPayment,
        verifyPayment,
        addExpense,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        updateUserAvatar,
        isDarkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
