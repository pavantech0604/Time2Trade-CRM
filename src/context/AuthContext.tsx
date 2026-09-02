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
      telecaller_notes: string;
      rm_assigned_to?: string;
    }
  ) => void;
  convertLeadToTrader: (leadId: string, rmId: string) => void;
  addTradingDay: (traderId: string, tradeDate: string, totalProfit: number, tradesCount: number) => void;
  addPayment: (paymentInput: Omit<Payment, 'id' | 'created_at' | 'status'>) => void;
  verifyPayment: (paymentId: string, isApproved: boolean, remarks?: string) => void;
  addExpense: (expenseInput: Omit<Expense, 'id' | 'created_at'>) => void;
  markNotificationRead: (id: string) => void;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useMocks = !isSupabaseConfigured || import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

  const [users, setUsers] = useState<User[]>(useMocks ? INITIAL_USERS : []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Presence and Attendance State
  const [presenceList, setPresenceList] = useState<UserPresence[]>(useMocks ? INITIAL_USER_PRESENCE : []);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(useMocks ? INITIAL_ATTENDANCE_LOGS : []);

  const [leads, setLeads] = useState<Lead[]>(useMocks ? INITIAL_LEADS : []);
  const [traders, setTraders] = useState<ActiveTrader[]>(useMocks ? INITIAL_TRADERS : []);
  const [tradingDays, setTradingDays] = useState<TradingDay[]>(useMocks ? INITIAL_TRADING_DAYS : []);
  const [payments, setPayments] = useState<Payment[]>(useMocks ? INITIAL_PAYMENTS : []);
  const [expenses, setExpenses] = useState<Expense[]>(useMocks ? INITIAL_EXPENSES : []);
  const [notifications, setNotifications] = useState<NotificationItem[]>(useMocks ? INITIAL_NOTIFICATIONS : []);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(useMocks ? INITIAL_AUDIT_LOGS : []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'this_month',
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
      }
    : null;

  const loadSupabaseData = async () => {
    if (!supabase) return;
    try {
      const [uRes, lRes, tRes, pRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('active_traders').select('*').order('joined_at', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false })
      ]);
      if (uRes.data) setUsers(uRes.data as User[]);
      if (lRes.data) setLeads(lRes.data as Lead[]);
      if (tRes.data) setTraders(tRes.data as ActiveTrader[]);
      if (pRes.data) setPayments(pRes.data as Payment[]);
    } catch (e) {
      console.error('Error fetching initial supabase data', e);
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
              .single();

            if (profile) {
              const userObj: User = {
                id: profile.id,
                name: profile.full_name || session.user.email?.split('@')[0] || 'Staff',
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
        const storedUser = localStorage.getItem('capital_grow_auth_user');
        if (storedUser) {
          const parsed: User = JSON.parse(storedUser);
          if (parsed && parsed.id && parsed.is_active && parsed.approval_status === 'approved') {
            setCurrentUser(parsed);
            if (supabase && !useMocks) await loadSupabaseData();
          } else {
            localStorage.removeItem('capital_grow_auth_user');
          }
        }
      } catch (err) {
        console.warn('Session check fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
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

      let newUserId = `usr-${Date.now()}`;

      // Supabase Signup
      if (supabase) {
        try {
          const { data, error: sbError } = await supabase.auth.signUp({
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
            console.warn('Supabase signup note:', sbError.message);
          } else if (data?.user) {
            newUserId = data.user.id;
          }
        } catch (sbErr) {
          console.warn('Supabase signup fallback:', sbErr);
        }
      }

      const newPendingUser: User = {
        id: newUserId,
        name: fullName.trim(),
        email: normalizedEmail,
        phone: phoneInput?.trim() || undefined,
        role: 'pending',
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
          user_role: 'pending',
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

      // Find user
      let matched = users.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail ||
          u.email.toLowerCase().replace('.com', '.in') === normalizedEmail ||
          u.email.toLowerCase().replace('.in', '.com') === normalizedEmail
      );

      // Role keyword matching fallback for staff testing
      if (!matched) {
        if (normalizedEmail.includes('telecaller') || normalizedEmail.includes('priya') || normalizedEmail.includes('ankit')) {
          matched = users.find((u) => u.role === 'telecaller' && u.approval_status === 'approved');
        } else if (normalizedEmail.includes('rm') || normalizedEmail.includes('vikram') || normalizedEmail.includes('rahul')) {
          matched = users.find((u) => u.role === 'relationship_manager' && u.approval_status === 'approved');
        } else if (normalizedEmail.includes('admin') || normalizedEmail.includes('rajesh')) {
          matched = users.find((u) => u.role === 'admin' && u.approval_status === 'approved');
        }
      }

      if (!matched) {
        setLoading(false);
        return {
          success: false,
          status: 'error',
          message: 'Invalid email or password. Please verify your credentials.',
        };
      }

      // Check approval status
      if (matched.approval_status === 'pending_admin_review' || matched.role === 'pending') {
        setLoading(false);
        return {
          success: false,
          status: 'pending',
          message: 'Your account is under administrative review. Access will be unlocked once an administrator assigns your role.',
        };
      }

      if (matched.approval_status === 'rejected') {
        setLoading(false);
        return {
          success: false,
          status: 'rejected',
          message: `Your account application was rejected. Reason: ${matched.rejection_reason || 'Compliance check failure.'}`,
        };
      }

      if (matched.is_active === false) {
        setLoading(false);
        return {
          success: false,
          status: 'disabled',
          message: 'Your employee account has been deactivated. Please contact the administrator.',
        };
      }

      // Verified active user -> Login success
      setCurrentUser(matched);
      localStorage.setItem('capital_grow_auth_user', JSON.stringify(matched));
      if (supabase && !useMocks) {
        await loadSupabaseData();
      }

      // Record Login Event & Set Presence Online
      const nowIso = new Date().toISOString();
      const loginLog: AttendanceLog = {
        id: `att-${Date.now()}`,
        user_id: matched.id,
        user_name: matched.name,
        user_role: matched.role,
        event_type: 'login',
        event_time: nowIso,
        status_before: 'offline',
        status_after: 'online',
      };
      setAttendanceLogs((prev) => [loginLog, ...prev]);

      const prevP = presenceList.find((p) => p.user_id === matched.id);
      const isLate = new Date().getHours() >= 10; // Late if logged in after 10:00 AM

      setPresenceList((prev) => [
        {
          user_id: matched.id,
          user_name: matched.name,
          user_email: matched.email,
          user_role: matched.role,
          current_status: 'online',
          last_status_change: nowIso,
          today_login_time: prevP?.today_login_time || nowIso,
          today_logout_time: undefined,
          total_break_minutes: prevP?.total_break_minutes || 0,
          total_lunch_minutes: prevP?.total_lunch_minutes || 0,
          is_late: isLate,
        },
        ...prev.filter((p) => p.user_id !== matched.id),
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
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem('capital_grow_auth_user');
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
  };

  // Admin Action: Reject Employee Application
  const rejectEmployee = async (userId: string, reason: string) => {
    const nowIso = new Date().toISOString();
    const adminId = currentUser?.id || 'admin-system';

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
    setIsDarkMode((prev) => !prev);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
    const storedUser = localStorage.getItem('capital_grow_auth_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('capital_grow_auth_user', JSON.stringify({ ...parsed, avatar_url: url }));
    }

    if (supabase && !useMocks) {
      await supabase.from('users').update({ avatar_url: url }).eq('id', currentUser.id);
    }
  };

  const addLead = async (leadInput: Omit<Lead, 'id' | 'created_at'>) => {
    const newId = generateUUID();
    const assignedUser = users.find((u) => u.id === leadInput.assigned_to);
    const newLead: Lead = {
      ...leadInput,
      id: newId,
      assigned_to_name: assignedUser?.name,
      created_at: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setLeads((prev) => [newLead, ...prev]);

    if (supabase && !useMocks) {
      await supabase.from('leads').insert({
        id: newId,
        name: leadInput.name,
        phone: leadInput.phone,
        source: leadInput.source,
        assigned_to: leadInput.assigned_to || null,
        rm_assigned_to: leadInput.rm_assigned_to || null,
        status: leadInput.status,
        telecaller_notes: leadInput.telecaller_notes,
        rm_notes: leadInput.rm_notes,
        investment_capacity: leadInput.investment_capacity,
        trading_experience: leadInput.trading_experience,
        preferred_market: leadInput.preferred_market,
        next_follow_up_at: leadInput.next_follow_up_at || null,
      });
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
      delete (dbUpdates as any).rm_assigned_to_name;
      await supabase.from('leads').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', leadId);
    }
  };

  const handoffLead = async (
    leadId: string,
    qualification: {
      investment_capacity: string;
      trading_experience: Lead['trading_experience'];
      preferred_market: string;
      telecaller_notes: string;
      rm_assigned_to?: string;
    }
  ) => {
    const rms = users.filter((u) => u.role === 'relationship_manager' && u.is_active);
    const selectedRMId = qualification.rm_assigned_to || rms[0]?.id;
    const selectedRMObj = users.find((u) => u.id === selectedRMId);
    const now = new Date().toISOString();

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status: 'interested_rm_required',
              investment_capacity: qualification.investment_capacity,
              trading_experience: qualification.trading_experience,
              preferred_market: qualification.preferred_market,
              telecaller_notes: qualification.telecaller_notes,
              rm_assigned_to: selectedRMId,
              rm_assigned_to_name: selectedRMObj?.name,
              updated_at: now,
            }
          : l
      )
    );

    if (supabase && !useMocks) {
      await supabase.from('leads').update({
        status: 'interested_rm_required',
        investment_capacity: qualification.investment_capacity,
        trading_experience: qualification.trading_experience,
        preferred_market: qualification.preferred_market,
        telecaller_notes: qualification.telecaller_notes,
        rm_assigned_to: selectedRMId,
        updated_at: now,
      }).eq('id', leadId);
    }

    if (selectedRMId) {
      const targetLead = leads.find((l) => l.id === leadId);
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: selectedRMId,
        title: 'New Lead Handoff Assigned',
        message: `${targetLead?.name || 'Lead'} interested in RM call (${qualification.preferred_market})`,
        type: 'info',
        is_read: false,
        link_path: '/rm-leads',
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  const convertLeadToTrader = async (leadId: string, rmId: string) => {
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
      rm_assigned_to: rmId,
      rm_assigned_to_name: rmObj?.name || 'RM',
      status: 'active',
      joined_at: now.split('T')[0],
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
          ? { ...l, status: 'active_trader', rm_assigned_to: rmId, rm_assigned_to_name: rmObj?.name, updated_at: now }
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
          rm_assigned_to: rmId,
          status: 'active',
          joined_at: now.split('T')[0],
        }),
        supabase.from('leads').update({ 
          status: 'active_trader', 
          rm_assigned_to: rmId, 
          updated_at: now 
        }).eq('id', leadId)
      ]);
    }
  };

  const addTradingDay = (traderId: string, tradeDate: string, totalProfit: number, tradesCount: number) => {
    const newTdId = `td-${Date.now()}`;
    const newTd: TradingDay = {
      id: newTdId,
      trader_id: traderId,
      trade_date: tradeDate,
      total_profit: totalProfit,
      trades_count: tradesCount,
      is_winning_day: totalProfit > 0,
      created_at: new Date().toISOString(),
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
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const addPayment = async (paymentInput: Omit<Payment, 'id' | 'created_at' | 'status'>) => {
    const targetTrader = traders.find((t) => t.id === paymentInput.trader_id);
    const newPayId = generateUUID();

    const newPayment: Payment = {
      ...paymentInput,
      id: newPayId,
      trader_name: targetTrader?.name || 'Trader',
      trader_phone: targetTrader?.phone,
      employee_id: currentUser?.id || 'sys',
      employee_name: currentUser?.name || 'Staff',
      status: 'pending_verification',
      created_at: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    if (supabase && !useMocks) {
      await supabase.from('payments').insert({
        id: newPayId,
        trader_id: paymentInput.trader_id,
        employee_id: paymentInput.employee_id || currentUser?.id || null,
        amount: paymentInput.amount,
        payment_mode: paymentInput.payment_mode,
        utr: paymentInput.utr,
        transaction_time: paymentInput.transaction_time,
        screenshot_url: paymentInput.screenshot_url,
        status: 'pending_verification'
      });
    }

    const adminUser = users.find((u) => u.role === 'admin');
    if (adminUser) {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: adminUser.id,
        title: 'New Payment Verification Required',
        message: `${newPayment.trader_name} submitted ₹${newPayment.amount} (UTR: ${newPayment.utr})`,
        type: 'warning',
        is_read: false,
        link_path: '/verification',
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
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

    if (isApproved) {
      const traderId = targetPayment.trader_id;
      const traderApprovedPayments = [
        ...payments.filter((p) => p.trader_id === traderId && p.id !== paymentId && p.status === 'approved'),
        { ...targetPayment, status: 'approved' as const },
      ];
      const totalShared = traderApprovedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      setTraders((prev) =>
        prev.map((t) => (t.id === traderId ? { ...t, total_profit_shared: totalShared, updated_at: now } : t))
      );
      
      if (supabase && !useMocks) {
        await Promise.all([
          supabase.from('payments').update({ status: newStatus, admin_remarks: remarks, verified_at: now }).eq('id', paymentId),
          supabase.from('active_traders').update({ total_profit_shared: totalShared, updated_at: now }).eq('id', traderId)
        ]);
      }
    } else {
      if (supabase && !useMocks) {
        await supabase.from('payments').update({ status: newStatus, admin_remarks: remarks, verified_at: now }).eq('id', paymentId);
      }
    }
  };

  const addExpense = (expenseInput: Omit<Expense, 'id' | 'created_at'>) => {
    const newExpId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseInput,
      id: newExpId,
      added_by: currentUser?.id || 'sys',
      added_by_name: currentUser?.name || 'Staff',
      created_at: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
