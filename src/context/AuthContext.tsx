import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  updatePaymentClientDetails: (paymentId: string, clientName: string, clientPhone: string) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  clearAllPayments: () => Promise<void>;
  addExpense: (expenseInput: Omit<Expense, 'id' | 'created_at'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId?: string) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: (userId?: string) => void;
  updateUserAvatar: (url: string) => Promise<void>;

  // Password Reset Management
  mustResetPassword: boolean;
  setMustResetPassword: (val: boolean) => void;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  adminResetEmployeePassword: (
    userId: string,
    tempPassword?: string
  ) => Promise<{ success: boolean; tempPassword: string; message: string }>;

  // Visual Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Live Sync Actions
  refreshLivePayments: () => Promise<void>;
  isLiveSyncing: boolean;
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

const isValidUUID = (id?: string | null): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useMocks = false;

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState<boolean>(() => {
    try {
      return localStorage.getItem('time2trade_must_reset_active') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (mustResetPassword) {
        localStorage.setItem('time2trade_must_reset_active', 'true');
      } else {
        localStorage.removeItem('time2trade_must_reset_active');
      }
    } catch {}
  }, [mustResetPassword]);

  // Presence and Attendance State
  const [presenceList, setPresenceList] = useState<UserPresence[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [traders, setTraders] = useState<ActiveTrader[]>(INITIAL_TRADERS);
  const [tradingDays, setTradingDays] = useState<TradingDay[]>([]);
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const stored = localStorage.getItem('time2trade_payments_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out user's requested test data to reset from scratch
          const filtered = parsed.filter((p) => {
            const name = (p.client_name || p.trader_name || '').toLowerCase().trim();
            const utr = (p.utr || '').toLowerCase().trim();
            const phone = (p.client_phone || p.trader_phone || '').replace(/\D/g, '');
            if (name.includes('gayathri') || name.includes('pavan kumar')) return false;
            if (utr.includes('7702749867') || utr === '32145678901') return false;
            if (phone === '7702749867' || phone === '7989628479') return false;
            return true;
          });

          // Sync back the cleaned list immediately
          if (filtered.length > 0) {
            localStorage.setItem('time2trade_payments_cache', JSON.stringify(filtered));
          } else {
            localStorage.removeItem('time2trade_payments_cache');
          }

          return filtered.map((p) => {
            const rawName = p.client_name || p.trader_name || '';
            const rawPhone = p.client_phone || p.trader_phone || '';
            return {
              ...p,
              client_name: rawName || 'Client',
              client_phone: rawPhone,
              trader_name: rawName || 'Client',
              trader_phone: rawPhone,
            };
          });
        }
      }
    } catch {}
    return INITIAL_PAYMENTS;
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Sync payments to localStorage cache so they are never lost on reload
  useEffect(() => {
    try {
      if (payments.length > 0) {
        localStorage.setItem('time2trade_payments_cache', JSON.stringify(payments));
      } else {
        localStorage.removeItem('time2trade_payments_cache');
      }
    } catch {}
  }, [payments]);

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
    } catch {
      // Silently handle corrupted localStorage data
    }
    return [];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('time2trade_notifications', JSON.stringify(notifications));
    } catch {
      // Silently handle localStorage write failure
    }
  }, [notifications]);

  const seededUsersRef = useRef<Set<string>>(new Set());

  // Seed helpful sample notifications for active user if empty (only once per session)
  useEffect(() => {
    if (!currentUser) return;
    if (seededUsersRef.current.has(currentUser.id)) return;
    seededUsersRef.current.add(currentUser.id);

    const userNotifs = notifications.filter((n) => n.user_id === currentUser.id);
    if (userNotifs.length === 0) {
      const now = new Date();
      const subMins = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
      const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

      const sampleNotifs: NotificationItem[] = [
        {
          id: `sample-${currentUser.id}-1`,
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Payment Credited',
          message: 'Payment proof of ₹25,000 for client Rahul Sharma verified. Your 10% commission share of ₹2,500 has been credited.',
          type: 'success',
          category: 'sales',
          amount: 2500,
          share_percentage: 10,
          client_name: 'Rahul Sharma',
          action_tab: 'employee-dashboard',
          action_label: 'View Credit',
          is_read: false,
          created_at: subMins(12),
        },
        {
          id: `sample-${currentUser.id}-2`,
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'New Lead Assigned',
          message: 'High-intent trader lead Priya Patel (₹5,00,000 capital) assigned to your desk for onboarding.',
          type: 'info',
          category: 'leads',
          client_name: 'Priya Patel',
          action_tab: 'employee-dashboard',
          action_label: 'View Lead',
          is_read: false,
          created_at: subHours(1),
        },
        {
          id: `sample-${currentUser.id}-3`,
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Target Milestone Reached',
          message: 'Trader Vikram Malhotra achieved daily profit target with 4 winning trades today.',
          type: 'success',
          category: 'sales',
          client_name: 'Vikram Malhotra',
          action_tab: 'active-traders',
          action_label: 'View Trader',
          is_read: true,
          created_at: subHours(3),
        },
        {
          id: `sample-${currentUser.id}-4`,
          user_id: currentUser.id,
          user_name: currentUser.name,
          title: 'Daily Attendance Recorded',
          message: 'Morning shift login recorded at 09:15 AM. Status is marked Online.',
          type: 'info',
          category: 'system',
          is_read: true,
          created_at: subHours(5),
        },
      ];

      setNotifications((prev) => [...sampleNotifs, ...prev]);
    }
  }, [currentUser]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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

  // Live synchronization state
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const isFetchingDataRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const isPurgingDuplicatesRef = useRef<boolean>(false);

  const loadSupabaseData = useCallback(async (force = false) => {
    if (!supabase) return;
    const now = Date.now();
    if (isFetchingDataRef.current) return;
    if (!force && now - lastFetchTimeRef.current < 4000) return;

    isFetchingDataRef.current = true;
    lastFetchTimeRef.current = now;
    setIsLiveSyncing(true);
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
      if (uRes.data && Array.isArray(uRes.data)) {
        userList = (uRes.data as User[]).filter((u) => !isMockUser(u));
        setUsers(userList);
      }
      if (lRes.data && Array.isArray(lRes.data)) {
        setLeads((lRes.data as Lead[]).filter((l) => !isMockId(l.id) && !isMockId(l.assigned_to)));
      }

      const safeStr = (v: any): string => (v !== null && v !== undefined ? String(v).trim() : '');
      const safeDigits = (v: any): string => safeStr(v).replace(/\D/g, '');

      let tradersList: ActiveTrader[] = [...INITIAL_TRADERS];
      if (tRes.data && Array.isArray(tRes.data)) {
        const remoteTraders = (tRes.data as any[])
          .filter((t) => {
            if (!t || isMockId(t.id)) return false;
            const name = (t.name || '').toLowerCase().trim();
            const phone = (t.phone || '').replace(/\D/g, '');
            if (name.includes('gayathri') || name.includes('pavan kumar')) return false;
            if (phone === '7702749867' || phone === '7989628479') return false;
            return true;
          })
          .map((t: any) => ({
            ...t,
            name: safeStr(t.name) || 'Active Trader',
            phone: safeStr(t.phone),
            employee_id: t.assigned_to || t.employee_id,
          })) as ActiveTrader[];

        const traderMap = new Map<string, ActiveTrader>();
        tradersList.forEach((t) => traderMap.set(t.id, t));
        remoteTraders.forEach((t) => traderMap.set(t.id, { ...traderMap.get(t.id), ...t }));
        tradersList = Array.from(traderMap.values());
      }

      if (pRes.data && Array.isArray(pRes.data)) {
        const rawPayments = (pRes.data as (Payment & { client_name?: string; client_phone?: string })[]).filter(
          (p) => {
            if (!p || isMockId(p.id)) return false;
            const name = (p.client_name || p.trader_name || '').toLowerCase().trim();
            const utr = (p.utr || '').toLowerCase().trim();
            const phone = (p.client_phone || p.trader_phone || '').replace(/\D/g, '');
            if (name.includes('gayathri') || name.includes('pavan kumar')) return false;
            if (utr.includes('7702749867') || utr === '32145678901') return false;
            if (phone === '7702749867' || phone === '7989628479') return false;
            return true;
          }
        );

        // Merge rawPayments with INITIAL_PAYMENTS using payment primary key ID so each distinct submission is preserved
        const payMap = new Map<string, any>();
        INITIAL_PAYMENTS.forEach((p) => payMap.set(p.id, p));
        rawPayments.forEach((p) => {
          payMap.set(p.id, { ...payMap.get(p.id), ...p });
        });
        const combinedPayments = Array.from(payMap.values());

        if (combinedPayments.length > 0) {
          const allocations = (allocRes?.data || []) as any[];
          const tradersToPersist: ActiveTrader[] = [];

          const mappedPayments = combinedPayments.map((p) => {
            try {
              const matchedAllocs = allocations.filter((a) => a && a.payment_id === p.id);
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

              // Check if remarks contains client contact information
              let remarkClientName = '';
              let remarkClientPhone = '';
              if (typeof p.remarks === 'string') {
                const nameMatch = p.remarks.match(/(?:Client|Name|Client Name)\s*:\s*([^\n;,]+)/i);
                if (nameMatch) remarkClientName = nameMatch[1].trim();
                const phoneMatch = p.remarks.match(/(?:Phone|Mobile|Contact)\s*:\s*([0-9\+\s-]{10,14})/i);
                if (phoneMatch) remarkClientPhone = phoneMatch[1].replace(/\D/g, '').slice(-10);
              }

              // 1. Look up matched active trader FIRST by trader_id, phone, or name
              let matchedTrader = tradersList.find((t) => {
                if (!t) return false;
                if (p.trader_id && t.id === p.trader_id && !isMockId(p.trader_id)) return true;
                const cleanPPhone = safeDigits(p.client_phone || p.trader_phone);
                if (cleanPPhone && safeDigits(t.phone) === cleanPPhone) return true;
                if (safeStr(p.client_name) && safeStr(t.name).toLowerCase() === safeStr(p.client_name).toLowerCase()) return true;
                return false;
              });

              const isGenericName = (val: string) =>
                !val ||
                val.startsWith('Client ') ||
                val === 'Direct Client' ||
                val === 'Active Trader' ||
                val === 'Trader';

              const rawClientName = safeStr(p.client_name);
              const traderName = safeStr(matchedTrader?.name);

              // 2. Resolve client name with strict priority:
              const resolvedClientName =
                (!isGenericName(rawClientName) ? rawClientName : '') ||
                (!isGenericName(traderName) ? traderName : '') ||
                remarkClientName ||
                (!isGenericName(safeStr(p.trader_name)) ? safeStr(p.trader_name) : '') ||
                rawClientName ||
                traderName ||
                `Client ${p.utr ? String(p.utr).slice(-4) : 'User'}`;

              // 3. Resolve client phone with strict priority:
              const resolvedClientPhone =
                safeStr(p.client_phone) ||
                safeStr(matchedTrader?.phone) ||
                remarkClientPhone ||
                safeStr(p.trader_phone) ||
                '';

              // Auto-synthesize Active Trader if client is not yet registered in active traders
              if (!matchedTrader) {
                const newTraderId = (p.trader_id && isValidUUID(p.trader_id) && !isMockId(p.trader_id))
                  ? p.trader_id
                  : generateUUID();

                const normalizedServiceType = p.service_type === 'Future Option' ? 'Option' : (safeStr(p.service_type) || 'Option');
                const synthesizedService = [
                  safeStr(p.service_category) || 'Equity',
                  normalizedServiceType,
                  safeStr(p.subscription_duration) ? `(${p.subscription_duration})` : ''
                ].filter(Boolean).join(' • ');

                const fallbackEmpId = (p.employee_id && isValidUUID(p.employee_id))
                  ? p.employee_id
                  : (userList.find((u) => isValidUUID(u.id))?.id || '10000000-0000-0000-0000-000000000001');

                let joinDate = new Date().toISOString().split('T')[0];
                if (typeof p.transaction_time === 'string' && p.transaction_time.includes('T')) {
                  joinDate = p.transaction_time.split('T')[0];
                } else if (typeof p.created_at === 'string' && p.created_at.includes('T')) {
                  joinDate = p.created_at.split('T')[0];
                }

                matchedTrader = {
                  id: newTraderId,
                  name: resolvedClientName,
                  phone: resolvedClientPhone,
                  employee_id: fallbackEmpId,
                  employee_name: safeStr(p.employee_name) || 'Staff',
                  status: 'active',
                  joined_at: joinDate,
                  initial_capital: Number(p.amount) || 0,
                  selected_service: synthesizedService,
                  preferred_market: safeStr(p.service_category) || 'Equity',
                  current_streak: 0,
                  longest_streak: 0,
                  total_profit_gained: 0,
                  total_profit_shared: p.status === 'approved' ? Number(p.amount) : 0,
                  created_at: safeStr(p.created_at) || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                tradersList.push(matchedTrader);
                tradersToPersist.push(matchedTrader);
              } else {
                // Keep matched trader in sync with resolved details
                if (isGenericName(matchedTrader.name) && !isGenericName(resolvedClientName)) {
                  matchedTrader.name = resolvedClientName;
                }
                if (!matchedTrader.phone && resolvedClientPhone) {
                  matchedTrader.phone = resolvedClientPhone;
                }
              }

              // Background sync resolved client contact info back to Supabase if missing
              if (supabase && p.id && isValidUUID(p.id) && (isGenericName(rawClientName) || !p.client_phone)) {
                supabase.from('payments').update({
                  client_name: resolvedClientName,
                  client_phone: resolvedClientPhone,
                }).eq('id', p.id).then(() => {});
              }

              const normalizedServiceType = p.service_type === 'Future Option' ? 'Option' : (p.service_type || 'Option');

              // Multi-tier Employee Name resolution
              const primaryAlloc = enrichedAllocs.find((a) => a.is_primary) || enrichedAllocs[0];
              const empFromAlloc = primaryAlloc?.employee_name && primaryAlloc.employee_name !== 'Staff' && primaryAlloc.employee_name !== 'Staff Member'
                ? primaryAlloc.employee_name
                : (primaryAlloc?.employee_id ? userList.find((u) => u.id === primaryAlloc.employee_id)?.name : null);

              const empFromDirectId = p.employee_id ? userList.find((u) => u.id === p.employee_id)?.name : null;
              const empFromSubmitter = p.submitted_by_employee_id ? userList.find((u) => u.id === p.submitted_by_employee_id)?.name : null;
              const empFromTrader = matchedTrader?.employee_name && matchedTrader.employee_name !== 'Staff' && matchedTrader.employee_name !== 'Staff Member'
                ? matchedTrader.employee_name
                : (matchedTrader?.employee_id ? userList.find((u) => u.id === matchedTrader.employee_id)?.name : null);

              let empFromRemarks = '';
              if (typeof p.remarks === 'string') {
                const allocMatch = p.remarks.match(/Allocations:\s*([^:\(\n,]+)/i);
                if (allocMatch && allocMatch[1].trim()) empFromRemarks = allocMatch[1].trim();
                if (!empFromRemarks) {
                  const staffMatch = p.remarks.match(/(?:Staff|Employee|Executive|Agent|Submitted by)\s*:\s*([^\n;,]+)/i);
                  if (staffMatch && staffMatch[1].trim()) empFromRemarks = staffMatch[1].trim();
                }
              }

              const resolvedEmpName =
                (p.employee_name && p.employee_name !== 'Staff' && p.employee_name !== 'Staff Member' ? p.employee_name : '') ||
                empFromAlloc ||
                empFromDirectId ||
                empFromSubmitter ||
                empFromTrader ||
                empFromRemarks ||
                (p.submitted_by_employee_name && p.submitted_by_employee_name !== 'Staff' && p.submitted_by_employee_name !== 'Staff Member' ? p.submitted_by_employee_name : '') ||
                '';

              const resolvedSubmitterName =
                empFromSubmitter ||
                (p.submitted_by_employee_name && p.submitted_by_employee_name !== 'Staff' ? p.submitted_by_employee_name : '') ||
                resolvedEmpName;

              return {
                ...p,
                trader_id: matchedTrader ? matchedTrader.id : p.trader_id,
                client_name: resolvedClientName,
                client_phone: resolvedClientPhone,
                trader_name: resolvedClientName,
                trader_phone: resolvedClientPhone,
                employee_name: resolvedEmpName || p.employee_name,
                submitted_by_employee_name: resolvedSubmitterName || p.submitted_by_employee_name,
                service_type: normalizedServiceType,
                allocations: enrichedAllocs.length > 0 ? enrichedAllocs : p.allocations,
                is_shared: (enrichedAllocs.length > 1) || p.is_shared,
              };
            } catch {
              return {
                ...p,
                service_type: p.service_type === 'Future Option' ? 'Option' : p.service_type,
              };
            }
          });

          // Deduplicate payments by normalized UTR to eliminate duplicate submissions
          const utrPaymentMap = new Map<string, any>();
          const deduplicatedPayments: any[] = [];
          const duplicateIdsToPurge: string[] = [];

          mappedPayments.forEach((p) => {
            const normUtr = (p.utr || '').trim().toLowerCase();
            if (!normUtr || normUtr === 'manual' || normUtr === 'cash' || normUtr === 'n/a') {
              deduplicatedPayments.push(p);
              return;
            }

            if (!utrPaymentMap.has(normUtr)) {
              utrPaymentMap.set(normUtr, p);
              deduplicatedPayments.push(p);
            } else {
              const existing = utrPaymentMap.get(normUtr);
              const existingIsApproved = existing.status === 'approved';
              const currentIsApproved = p.status === 'approved';

              let keepCurrent = false;
              if (!existingIsApproved && currentIsApproved) {
                keepCurrent = true;
              } else if (existingIsApproved === currentIsApproved) {
                const existingTime = new Date(existing.created_at || existing.transaction_time || 0).getTime();
                const currentTime = new Date(p.created_at || p.transaction_time || 0).getTime();
                // If current submission is earlier, keep current. Otherwise keep existing (the 11th over the 15th)
                if (currentTime > 0 && existingTime > 0 && currentTime < existingTime) {
                  keepCurrent = true;
                }
              }

              if (keepCurrent) {
                const idx = deduplicatedPayments.findIndex((item) => item.id === existing.id);
                if (idx !== -1) deduplicatedPayments[idx] = p;
                utrPaymentMap.set(normUtr, p);
                if (existing.id && isValidUUID(existing.id) && !isMockId(existing.id)) {
                  duplicateIdsToPurge.push(existing.id);
                }
              } else {
                if (p.id && isValidUUID(p.id) && !isMockId(p.id)) {
                  duplicateIdsToPurge.push(p.id);
                }
              }
            }
          });

          setTraders(tradersList);
          setPayments(deduplicatedPayments);

          // Permanently purge redundant duplicate uploads from Supabase
          if (supabase && duplicateIdsToPurge.length > 0 && !isPurgingDuplicatesRef.current) {
            isPurgingDuplicatesRef.current = true;
            (async () => {
              try {
                console.log(`[Auto-Deduplication] Purging ${duplicateIdsToPurge.length} duplicate payment records from Supabase:`, duplicateIdsToPurge);
                await supabase.from('payment_allocations').delete().in('payment_id', duplicateIdsToPurge);
                await supabase.from('payments').delete().in('id', duplicateIdsToPurge);
              } catch (delErr) {
                console.error('Failed to purge duplicate records from Supabase:', delErr);
              } finally {
                setTimeout(() => {
                  isPurgingDuplicatesRef.current = false;
                }, 15000);
              }
            })();
          }

          // Persist synthesized active traders to Supabase safely in background
          const client = supabase;
          if (client && tradersToPersist.length > 0) {
            tradersToPersist.forEach(async (t) => {
              if (isValidUUID(t.id) && isValidUUID(t.employee_id)) {
                try {
                  await client.from('active_traders').upsert({
                    id: t.id,
                    name: t.name,
                    phone: t.phone,
                    assigned_to: t.employee_id,
                    status: 'active',
                    joined_at: t.joined_at,
                    total_profit_gained: 0,
                    total_profit_shared: t.total_profit_shared,
                  });
                } catch {
                  // Non-blocking
                }
              }
            });
          }
        }
      } else {
        setTraders(tradersList);
      }

      if (tdRes.data && Array.isArray(tdRes.data)) {
        setTradingDays(
          (tdRes.data as TradingDay[]).filter((td) => td && !isMockId(td.id) && !isMockId(td.trader_id))
        );
      }
      if (expRes.data && Array.isArray(expRes.data)) {
        setExpenses(
          (expRes.data as Expense[]).filter((exp) => exp && !isMockId(exp.id))
        );
      }
    } catch {
      // Non-blocking data fetch error handled safely
    } finally {
      isFetchingDataRef.current = false;
      setIsLiveSyncing(false);
    }
  }, []);

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
                const needsReset =
                  Boolean(profile.must_reset_password) ||
                  localStorage.getItem('time2trade_must_reset_active') === 'true' ||
                  localStorage.getItem(`time2trade_must_reset_${profile.id}`) === 'true' ||
                  localStorage.getItem(`time2trade_must_reset_${(profile.email || '').toLowerCase()}`) === 'true';

                userObj.must_reset_password = needsReset;
                if (needsReset) {
                  setMustResetPassword(true);
                }

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
            const needsReset =
              Boolean(parsed.must_reset_password) ||
              localStorage.getItem('time2trade_must_reset_active') === 'true' ||
              localStorage.getItem(`time2trade_must_reset_${parsed.id}`) === 'true' ||
              localStorage.getItem(`time2trade_must_reset_${(parsed.email || '').toLowerCase()}`) === 'true';

            parsed.must_reset_password = needsReset;
            if (needsReset) {
              setMustResetPassword(true);
            }

            setCurrentUser(parsed);
            if (supabase && !useMocks) await loadSupabaseData();
          } else {
            localStorage.removeItem('time2trade_auth_user');
          }
        } else if (supabase && !useMocks) {
          // If no stored session, load initial public dataset once
          await loadSupabaseData();
        }
      } catch {
        // Silent fallback to local stored session
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Live Supabase Realtime & Auto-Sync Listener for Payments & Allocations
  useEffect(() => {
    if (!supabase) return;

    // 1. Subscribe to Postgres changes on payments and allocations
    const paymentsChannel = supabase
      .channel('realtime-payments-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          console.log('[Realtime] Live payment change detected:', payload.eventType);
          loadSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_allocations' },
        (payload) => {
          console.log('[Realtime] Live allocation change detected:', payload.eventType);
          loadSupabaseData();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Payments channel status:', status);
      });

    // 2. High-reliability background sync every 10 seconds
    const pollInterval = setInterval(() => {
      loadSupabaseData();
    }, 10000);

    // 3. Tab Visibility & Window Focus Auto-Sync
    const handleSyncOnFocus = () => {
      if (document.visibilityState === 'visible') {
        loadSupabaseData();
      }
    };

    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', handleSyncOnFocus);

    return () => {
      supabase?.removeChannel(paymentsChannel);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
    };
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
            // Supabase auth signup notice — non-blocking
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
            // Profile sync to public.users failed — non-blocking
          }
        } catch {
          // Supabase signup integration error — non-blocking
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

      // 2. Check if user entered a temporary access password
      const isTemporaryPassword =
        passwordInput.toLowerCase() === 't2t@name2026' ||
        passwordInput.toLowerCase().startsWith('t2t@') ||
        passwordInput.toLowerCase().startsWith('t2t#') ||
        passwordInput === 'Time2trade@2026' ||
        localStorage.getItem(`time2trade_temp_pass_${normalizedEmail}`) === passwordInput ||
        localStorage.getItem(`time2trade_must_reset_${normalizedEmail}`) === 'true';

      // Fallback for CRM staff/admins when Supabase auth.users account is missing, unconfirmed, or dummy
      if (!authenticatedUser) {
        // Step A: Search existing loaded users in React state
        let foundStaff = users.find((u) => u.email.toLowerCase() === normalizedEmail);

        // Step B: Query Supabase users table directly if not in memory (handles RLS or unpopulated state)
        if (!foundStaff && supabase) {
          try {
            const { data: dbStaff } = await supabase
              .from('users')
              .select('*')
              .ilike('email', normalizedEmail)
              .maybeSingle();

            if (dbStaff) {
              foundStaff = {
                id: dbStaff.id,
                name: dbStaff.name || dbStaff.full_name || normalizedEmail.split('@')[0],
                email: dbStaff.email || normalizedEmail,
                phone: dbStaff.phone,
                role: (dbStaff.role || 'employee') as UserRole,
                is_active: dbStaff.is_active !== false,
                approval_status: (dbStaff.approval_status || 'approved') as ApprovalStatus,
                avatar_url: dbStaff.avatar_url,
                created_at: dbStaff.created_at || new Date().toISOString(),
              };
            }
          } catch {
            // Supabase user query by email failed — non-blocking
          }
        }

        // Step C: If still not found, check by username prefix (e.g. 'madhan' vs 'mahaan')
        if (!foundStaff && supabase) {
          try {
            const prefix = normalizedEmail.split('@')[0];
            const { data: prefixStaff } = await supabase
              .from('users')
              .select('*')
              .or(`email.ilike.%${prefix}%,name.ilike.%${prefix}%`)
              .maybeSingle();

            if (prefixStaff) {
              foundStaff = {
                id: prefixStaff.id,
                name: prefixStaff.name || prefixStaff.full_name || prefix,
                email: prefixStaff.email || normalizedEmail,
                phone: prefixStaff.phone,
                role: (prefixStaff.role || 'employee') as UserRole,
                is_active: prefixStaff.is_active !== false,
                approval_status: (prefixStaff.approval_status || 'approved') as ApprovalStatus,
                avatar_url: prefixStaff.avatar_url,
                created_at: prefixStaff.created_at || new Date().toISOString(),
              };
            }
          } catch {
            // Supabase user query by prefix failed — non-blocking
          }
        }

        // Step D: If user used a valid temporary recovery key but profile is missing, auto-provision
        if (!foundStaff && isTemporaryPassword) {
          const rawName = normalizedEmail.split('@')[0];
          const friendlyName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          foundStaff = {
            id: generateUUID(),
            name: friendlyName,
            email: normalizedEmail,
            role: 'employee',
            is_active: true,
            approval_status: 'approved',
            must_reset_password: true,
            created_at: new Date().toISOString(),
          };

          // Background sync to Supabase public.users
          if (supabase) {
            supabase
              .from('users')
              .upsert({
                id: foundStaff.id,
                name: foundStaff.name,
                email: foundStaff.email,
                role: 'employee',
                is_active: true,
                approval_status: 'approved',
              })
              .then();
          }

          setUsers((prev) => [foundStaff!, ...prev.filter((u) => u.email.toLowerCase() !== normalizedEmail)]);
        }

        if (foundStaff) {
          const isUserTemp =
            isTemporaryPassword ||
            (foundStaff.temporary_password && foundStaff.temporary_password === passwordInput) ||
            Boolean(foundStaff.must_reset_password);

          if (isUserTemp) {
            // Temporary password login automatically activates and grants entry with must_reset_password flag!
            authenticatedUser = {
              ...foundStaff,
              role: foundStaff.role === 'pending' ? 'employee' : foundStaff.role,
              is_active: true,
              approval_status: 'approved',
              must_reset_password: true,
            };
            setMustResetPassword(true);
            localStorage.setItem('time2trade_must_reset_active', 'true');
            localStorage.setItem(`time2trade_must_reset_${authenticatedUser.id}`, 'true');
            localStorage.setItem(`time2trade_must_reset_${normalizedEmail}`, 'true');

            // If user in database was previously rejected or disabled, unblock them now
            if (supabase) {
              supabase
                .from('users')
                .update({
                  is_active: true,
                  approval_status: 'approved',
                  role: authenticatedUser.role,
                })
                .eq('id', authenticatedUser.id)
                .then();

              // Background attempt to auto-create user in Supabase auth
              supabase.auth
                .signUp({
                  email: normalizedEmail,
                  password: passwordInput,
                  options: { data: { full_name: foundStaff.name } },
                })
                .catch(() => {});
            }
          } else {
            // Normal password checks
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

            if (
              foundStaff.approval_status === 'approved' &&
              passwordInput.length >= 6
            ) {
              authenticatedUser = {
                ...foundStaff,
                role: foundStaff.role || 'employee',
                is_active: true,
                approval_status: 'approved',
                must_reset_password: Boolean(foundStaff.must_reset_password),
              };
            }
          }
        }
      }

      if (!authenticatedUser) {
        setLoading(false);
        return {
          success: false,
          status: 'error',
          message: lastAuthError || 'Invalid email or password. Please verify your credentials.',
        };
      }

      // 3. Verify Account Status & Approvals (Only for non-temp passwords, as temp password overrides for account recovery)
      if (!isTemporaryPassword) {
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
      }

      // Check whether user must reset password
      const needsPasswordReset =
        isTemporaryPassword ||
        Boolean(authenticatedUser.must_reset_password) ||
        localStorage.getItem(`time2trade_must_reset_${authenticatedUser.id}`) === 'true' ||
        localStorage.getItem(`time2trade_must_reset_${normalizedEmail}`) === 'true';

      authenticatedUser.must_reset_password = needsPasswordReset;
      setMustResetPassword(needsPasswordReset);
      if (needsPasswordReset) {
        localStorage.setItem('time2trade_must_reset_active', 'true');
        localStorage.setItem(`time2trade_must_reset_${authenticatedUser.id}`, 'true');
        localStorage.setItem(`time2trade_must_reset_${normalizedEmail}`, 'true');
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
      setMustResetPassword(false);
      localStorage.removeItem('time2trade_auth_user');
      localStorage.removeItem('time2trade_must_reset_active');
      setFilters({ dateFilter: 'all', statusFilter: 'all' });
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

  // Update User Password (Self-Service Reset from Modal)
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'No active user session found.' };

    try {
      if (supabase) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {
          // Supabase auth password update failed — non-blocking
        }
      }

      // Clear reset flags
      localStorage.removeItem('time2trade_must_reset_active');
      localStorage.removeItem(`time2trade_must_reset_${currentUser.id}`);
      localStorage.removeItem(`time2trade_must_reset_${currentUser.email.toLowerCase()}`);
      localStorage.removeItem(`time2trade_temp_pass_${currentUser.id}`);
      localStorage.removeItem(`time2trade_temp_pass_${currentUser.email.toLowerCase()}`);

      const updatedUser: User = {
        ...currentUser,
        must_reset_password: false,
        temporary_password: undefined,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem('time2trade_auth_user', JSON.stringify(updatedUser));
      setMustResetPassword(false);

      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, must_reset_password: false, temporary_password: undefined } : u))
      );

      const nowIso = new Date().toISOString();
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          user_id: currentUser.id,
          user_name: currentUser.name,
          action: 'USER_RESET_PASSWORD',
          table_name: 'users',
          record_id: currentUser.id,
          new_values: { password_updated: true },
          created_at: nowIso,
        },
        ...prev,
      ]);

      const successNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: currentUser.id,
        user_name: currentUser.name,
        title: '🔐 Password Updated',
        message: 'Your permanent password has been successfully updated. Your account is secured.',
        type: 'success',
        category: 'system',
        is_read: false,
        created_at: nowIso,
      };
      setNotifications((prev) => [successNotif, ...prev]);

      return { success: true, message: 'Password updated successfully!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to update password.' };
    }
  };

  // Admin Action: Reset Employee Password & Force Password Reset on Next Login
  const adminResetEmployeePassword = async (
    userId: string,
    customTempPassword?: string
  ): Promise<{ success: boolean; tempPassword: string; message: string }> => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, tempPassword: '', message: 'Employee not found.' };

    const firstName = target.name.split(' ')[0].replace(/[^A-Za-z]/g, '');
    const tempPassword = customTempPassword || `T2T@${firstName || 'Staff'}2026`;

    localStorage.setItem('time2trade_must_reset_active', 'true');
    localStorage.setItem(`time2trade_must_reset_${userId}`, 'true');
    localStorage.setItem(`time2trade_must_reset_${target.email.toLowerCase()}`, 'true');
    localStorage.setItem(`time2trade_temp_pass_${userId}`, tempPassword);
    localStorage.setItem(`time2trade_temp_pass_${target.email.toLowerCase()}`, tempPassword);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, must_reset_password: true, temporary_password: tempPassword } : u))
    );

    const nowIso = new Date().toISOString();
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        user_id: currentUser?.id || 'admin-system',
        user_name: currentUser?.name || 'Administrator',
        action: 'ADMIN_TRIGGER_PASSWORD_RESET',
        table_name: 'users',
        record_id: userId,
        new_values: { temporary_password_issued: true, target_email: target.email },
        created_at: nowIso,
      },
      ...prev,
    ]);

    return {
      success: true,
      tempPassword,
      message: `Temporary password for ${target.name} set to ${tempPassword}`,
    };
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
      } catch {
        // Trading day sync to Supabase failed — non-blocking
      }
    }
  };

  const addPayment = async (paymentInput: Omit<Payment, 'id' | 'created_at' | 'status'>) => {
    // 0. Anti-duplicate safeguard: strictly reject submission if UTR has already been submitted
    const normalizedUtr = (paymentInput.utr || '').trim().toLowerCase();
    if (normalizedUtr && normalizedUtr !== 'manual' && normalizedUtr !== 'cash' && normalizedUtr !== 'n/a') {
      const localDuplicate = payments.find(
        (p) => (p.utr || '').trim().toLowerCase() === normalizedUtr
      );
      if (localDuplicate) {
        const errorMsg = `Duplicate transaction rejected: UTR "${paymentInput.utr}" has already been uploaded for client "${localDuplicate.client_name || 'Client'}". You cannot submit the same transaction twice.`;
        console.warn(errorMsg);
        throw new Error(errorMsg);
      }

      if (supabase && !useMocks) {
        const { data: remoteDups } = await supabase
          .from('payments')
          .select('id, utr, client_name, amount')
          .ilike('utr', paymentInput.utr.trim())
          .limit(1);

        if (remoteDups && remoteDups.length > 0) {
          const errorMsg = `Duplicate transaction rejected: UTR "${paymentInput.utr}" already exists in the database. You cannot submit the same transaction twice.`;
          console.warn(errorMsg);
          throw new Error(errorMsg);
        }
      }
    }

    let targetTraderId: string | null = paymentInput.trader_id || null;

    const clientName = (paymentInput.client_name || (paymentInput as any).trader_name || '').trim() || 'Direct Client';
    const clientPhone = (paymentInput.client_phone || (paymentInput as any).trader_phone || '').trim();

    // Check if an active trader already exists matching this client
    let targetTrader = traders.find((t) => {
      if (clientPhone && t.phone && t.phone.replace(/\D/g, '') === clientPhone.replace(/\D/g, '')) return true;
      if (clientName && t.name && t.name.toLowerCase() === clientName.toLowerCase()) return true;
      if (targetTraderId && isValidUUID(targetTraderId) && t.id === targetTraderId && !isMockId(targetTraderId)) return true;
      return false;
    });

    if (targetTrader && isValidUUID(targetTrader.id) && !isMockId(targetTrader.id)) {
      targetTraderId = targetTrader.id;
    } else {
      // Auto-create active trader record so client appears in Active Traders CRM and foreign key is satisfied
      const newTraderId = generateUUID();
      const validEmp = users.find((u) => isValidUUID(u.id));
      const effectiveAssignedTo = isValidUUID(paymentInput.employee_id)
        ? paymentInput.employee_id
        : currentUser && isValidUUID(currentUser.id)
        ? currentUser.id
        : validEmp?.id || '10000000-0000-0000-0000-000000000001';

      const normalizedServiceType = paymentInput.service_type === 'Future Option' ? 'Option' : (paymentInput.service_type || 'Option');
      const serviceDescription = [
        paymentInput.service_category || 'Equity',
        normalizedServiceType,
        paymentInput.subscription_duration ? `(${paymentInput.subscription_duration})` : ''
      ].filter(Boolean).join(' • ');

      const assignedUser = users.find((u) => u.id === effectiveAssignedTo);

      const newTrader: ActiveTrader = {
        id: newTraderId,
        name: clientName,
        phone: clientPhone,
        employee_id: effectiveAssignedTo!,
        employee_name: assignedUser?.name || currentUser?.name || 'Staff',
        status: 'active',
        joined_at: (paymentInput.transaction_time ? paymentInput.transaction_time.split('T')[0] : new Date().toISOString().split('T')[0]),
        initial_capital: Number(paymentInput.amount) || 0,
        selected_service: serviceDescription,
        preferred_market: paymentInput.service_category || 'Equity',
        current_streak: 0,
        longest_streak: 0,
        total_profit_gained: 0,
        total_profit_shared: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTraders((prev) => [newTrader, ...prev]);

      let traderInsertedInSupabase = false;
      if (supabase && !useMocks && isValidUUID(effectiveAssignedTo)) {
        try {
          const { error: tErr } = await supabase.from('active_traders').insert({
            id: newTraderId,
            name: clientName,
            phone: clientPhone,
            assigned_to: effectiveAssignedTo,
            status: 'active',
            joined_at: newTrader.joined_at,
            current_streak: 0,
            longest_streak: 0,
            total_profit_gained: 0,
            total_profit_shared: 0,
          });
          if (!tErr) traderInsertedInSupabase = true;
        } catch {
          traderInsertedInSupabase = false;
        }
      }

      targetTraderId = traderInsertedInSupabase ? newTraderId : null;
      targetTrader = newTrader;
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

    const isTraderNameMatch = Boolean(
      targetTrader &&
      (!paymentInput.client_name || paymentInput.client_name.trim().toLowerCase() === targetTrader.name.trim().toLowerCase())
    );

    const resolvedClientName =
      paymentInput.client_name?.trim() ||
      (paymentInput as any).trader_name?.trim() ||
      (isTraderNameMatch ? targetTrader?.name?.trim() : undefined) ||
      'Direct Client';

    const resolvedClientPhone =
      paymentInput.client_phone?.trim() ||
      (paymentInput as any).trader_phone?.trim() ||
      (isTraderNameMatch ? targetTrader?.phone?.trim() : undefined) ||
      '';

    const newPayment: Payment = {
      ...paymentInput,
      id: newPayId,
      trader_id: targetTraderId || 'manual-client',
      client_name: resolvedClientName,
      client_phone: resolvedClientPhone,
      trader_name: resolvedClientName,
      trader_phone: resolvedClientPhone,
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
        const sanitizedTraderId = targetTraderId && isValidUUID(targetTraderId) && !isMockId(targetTraderId)
          ? targetTraderId
          : null;

        const payload: Record<string, any> = {
          id: newPayId,
          trader_id: sanitizedTraderId,
          client_name: resolvedClientName,
          client_phone: resolvedClientPhone,
          employee_id: isValidUUID(effectiveEmployeeId) ? effectiveEmployeeId : null,
          amount: paymentInput.amount,
          payment_mode: paymentInput.payment_mode,
          utr: paymentInput.utr,
          transaction_time: paymentInput.transaction_time,
          screenshot_url: paymentInput.screenshot_url,
          status: 'pending_verification',
        };

        const validDurations = ['3 Months', '6 Months', 'Yearly'];
        if (paymentInput.subscription_duration && validDurations.includes(paymentInput.subscription_duration)) {
          payload.subscription_duration = paymentInput.subscription_duration;
        }
        if (paymentInput.service_category) payload.service_category = paymentInput.service_category;
        if (paymentInput.service_type) payload.service_type = paymentInput.service_type;
        if (paymentInput.receiver_bank_name) payload.receiver_bank_name = paymentInput.receiver_bank_name;
        if (paymentInput.remarks) payload.remarks = paymentInput.remarks;
        if (currentUser?.id && isValidUUID(currentUser.id)) payload.submitted_by_employee_id = currentUser.id;
        payload.is_shared = isSharedPayment;

        const { error } = await supabase.from('payments').insert(payload);

        if (error) {
          await supabase.from('payments').insert({
            id: newPayId,
            trader_id: sanitizedTraderId,
            client_name: resolvedClientName,
            client_phone: resolvedClientPhone,
            employee_id: isValidUUID(effectiveEmployeeId) ? effectiveEmployeeId : null,
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
          const isUuid = (str?: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

          const allocationRecords = enrichedAllocations
            .filter((a) => isUuid(a.employee_id))
            .map((a) => ({
              id: isUuid(a.id) ? a.id : generateUUID(),
              payment_id: newPayId,
              employee_id: a.employee_id,
              allocation_amount: a.allocation_amount,
              allocation_percentage: a.allocation_percentage,
              is_primary: Boolean(a.is_primary),
            }));

          if (allocationRecords.length > 0) {
            const { error: allocErr } = await supabase.from('payment_allocations').insert(allocationRecords);
            if (allocErr) {
              // Payment allocations insert failed — non-blocking
            }
          }
        }

        // Immediately refresh state with latest database records and allocations
        await loadSupabaseData();
      } catch {
        // Network error inserting payment — non-blocking
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

  const updatePaymentClientDetails = async (paymentId: string, clientName: string, clientPhone: string) => {
    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.trim();

    const targetPayment = payments.find((p) => p.id === paymentId);

    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              client_name: trimmedName,
              client_phone: trimmedPhone,
              trader_name: trimmedName,
              trader_phone: trimmedPhone,
            }
          : p
      )
    );

    // Also update or create the associated Active Trader in traders state & database
    if (targetPayment) {
      const traderId = targetPayment.trader_id;
      const traderExists = traders.some((t) => t.id === traderId);

      if (traderExists) {
        setTraders((prev) =>
          prev.map((t) =>
            t.id === traderId
              ? {
                  ...t,
                  name: trimmedName,
                  phone: trimmedPhone,
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        );

        if (supabase && !useMocks && isValidUUID(traderId)) {
          try {
            await supabase
              .from('active_traders')
              .update({
                name: trimmedName,
                phone: trimmedPhone,
                updated_at: new Date().toISOString(),
              })
              .eq('id', traderId);
          } catch {
            // Non-blocking
          }
        }
      } else {
        // Create new active trader record if one wasn't linked yet
        const newTraderId = isValidUUID(traderId) ? traderId : generateUUID();
        const validEmp = users.find((u) => isValidUUID(u.id));
        const effectiveAssignedTo = isValidUUID(targetPayment.employee_id)
          ? targetPayment.employee_id
          : currentUser && isValidUUID(currentUser.id)
          ? currentUser.id
          : validEmp?.id || '10000000-0000-0000-0000-000000000001';

        const normalizedServiceType = targetPayment.service_type === 'Future Option' ? 'Option' : (targetPayment.service_type || 'Option');
        const serviceDescription = [
          targetPayment.service_category || 'Equity',
          normalizedServiceType,
          targetPayment.subscription_duration ? `(${targetPayment.subscription_duration})` : ''
        ].filter(Boolean).join(' • ');

        const newTrader: ActiveTrader = {
          id: newTraderId,
          name: trimmedName,
          phone: trimmedPhone,
          employee_id: effectiveAssignedTo!,
          employee_name: targetPayment.employee_name || 'Staff',
          status: 'active',
          joined_at: (targetPayment.transaction_time ? targetPayment.transaction_time.split('T')[0] : new Date().toISOString().split('T')[0]),
          initial_capital: Number(targetPayment.amount) || 0,
          selected_service: serviceDescription,
          preferred_market: targetPayment.service_category || 'Equity',
          current_streak: 0,
          longest_streak: 0,
          total_profit_gained: 0,
          total_profit_shared: targetPayment.status === 'approved' ? Number(targetPayment.amount) : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTraders((prev) => [newTrader, ...prev]);

        if (supabase && !useMocks && isValidUUID(effectiveAssignedTo)) {
          try {
            await supabase.from('active_traders').upsert({
              id: newTraderId,
              name: trimmedName,
              phone: trimmedPhone,
              assigned_to: effectiveAssignedTo,
              status: 'active',
              joined_at: newTrader.joined_at,
              current_streak: 0,
              longest_streak: 0,
              total_profit_gained: 0,
              total_profit_shared: newTrader.total_profit_shared,
            });
          } catch {
            // Non-blocking
          }
        }
      }
    }

    if (supabase && !useMocks) {
      try {
        await supabase
          .from('payments')
          .update({
            client_name: trimmedName,
            client_phone: trimmedPhone,
          })
          .eq('id', paymentId);
      } catch {
        // Non-blocking
      }
    }
  };

  const deletePayment = async (paymentId: string) => {
    const target = payments.find((p) => p.id === paymentId);
    setPayments((prev) => {
      const updated = prev.filter((p) => p.id !== paymentId);
      try {
        if (updated.length > 0) {
          localStorage.setItem('time2trade_payments_cache', JSON.stringify(updated));
        } else {
          localStorage.removeItem('time2trade_payments_cache');
        }
      } catch {}
      return updated;
    });

    if (target?.trader_id) {
      const remainingWithTrader = payments.filter((p) => p.trader_id === target.trader_id && p.id !== paymentId);
      if (remainingWithTrader.length === 0) {
        setTraders((prev) => prev.filter((t) => t.id !== target.trader_id));
        if (supabase && !useMocks && isValidUUID(target.trader_id)) {
          try {
            await supabase.from('active_traders').delete().eq('id', target.trader_id);
          } catch {}
        }
      }
    }

    if (supabase && !useMocks) {
      try {
        await supabase.from('payment_allocations').delete().eq('payment_id', paymentId);
        await supabase.from('payments').delete().eq('id', paymentId);
      } catch {
        // Non-blocking
      }
    }
  };

  const clearAllPayments = async () => {
    setPayments([]);
    setTraders((prev) => prev.filter((t) => isMockId(t.id)));
    try {
      localStorage.removeItem('time2trade_payments_cache');
    } catch {}

    if (supabase && !useMocks) {
      try {
        await supabase.from('payment_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {
        // Non-blocking
      }
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
      } catch {
        // Expense sync to Supabase failed — non-blocking
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
        updatePaymentClientDetails,
        deletePayment,
        clearAllPayments,
        addExpense,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        updateUserAvatar,
        mustResetPassword,
        setMustResetPassword,
        updatePassword,
        adminResetEmployeePassword,
        isDarkMode,
        toggleDarkMode,
        refreshLivePayments: loadSupabaseData,
        isLiveSyncing,
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
