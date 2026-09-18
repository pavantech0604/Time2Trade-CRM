import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Payment } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../lib/calculations';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ZoomIn,
  CheckSquare,
  X,
  Copy,
  Check,
  Phone,
  PhoneCall,
  MessageSquare,
  Edit3,
  Save,
  Search,
  Loader2,
  Clock,
  RotateCcw,
  Users,
  Wallet,
  ChevronDown,
  Calendar,
  Trash2,
} from 'lucide-react';

export const PaymentVerification: React.FC = () => {
  const {
    payments,
    verifyPayment,
    updatePaymentClientDetails,
    deletePayment,
    traders,
    users,
    leads,
    refreshLivePayments,
  } = useAuth();

  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Automatically refresh payments on mount and periodically in the background
  useEffect(() => {
    refreshLivePayments();
    const interval = setInterval(() => {
      refreshLivePayments();
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);

  // Multi-tier client name and phone resolution
  const resolveClientContact = (payment: Payment) => {
    let name = (payment.client_name || payment.trader_name || '').trim();
    let phone = (payment.client_phone || payment.trader_phone || '').trim();

    const isGeneric = (val: string) =>
      !val ||
      val.toLowerCase() === 'client' ||
      val.toLowerCase() === 'direct client' ||
      val.toLowerCase() === 'active trader' ||
      val.toLowerCase() === 'trader' ||
      val.startsWith('Client ');

    // 1. Cross-reference traders list
    if (isGeneric(name) || !phone) {
      const matched = traders.find((t) => {
        if (payment.trader_id && t.id === payment.trader_id) return true;
        const pDigits = phone.replace(/\D/g, '');
        if (pDigits && t.phone && t.phone.replace(/\D/g, '') === pDigits) return true;
        if (name && !isGeneric(name) && t.name.toLowerCase() === name.toLowerCase()) return true;
        return false;
      });
      if (matched) {
        if (isGeneric(name) && matched.name) name = matched.name.trim();
        if (!phone && matched.phone) phone = matched.phone.trim();
      }
    }

    // 2. Parse remarks
    if ((isGeneric(name) || !phone) && typeof payment.remarks === 'string') {
      if (isGeneric(name)) {
        const nameMatch = payment.remarks.match(/(?:Client|Name|Client Name)\s*:\s*([^\n;,]+)/i);
        if (nameMatch && nameMatch[1].trim()) name = nameMatch[1].trim();
      }
      if (!phone) {
        const phoneMatch = payment.remarks.match(/(?:Phone|Mobile|Contact)\s*:\s*([0-9\+\s-]{10,14})/i);
        if (phoneMatch) phone = phoneMatch[1].replace(/\D/g, '').slice(-10);
      }
    }

    const finalName = !isGeneric(name) ? name : (name || 'Client');
    const hasSpecificName = !isGeneric(name);

    return {
      name: finalName,
      phone,
      hasSpecificName,
      hasPhone: Boolean(phone && phone.replace(/\D/g, '').length >= 10),
    };
  };

  // Multi-tier employee resolution to guarantee exact staff member identification
  const resolveEmployeeContact = (payment: Payment) => {
    const isGenericStaff = (val?: string) =>
      !val ||
      val.toLowerCase() === 'staff' ||
      val.toLowerCase() === 'staff member' ||
      val.toLowerCase() === 'employee' ||
      val.toLowerCase() === 'unknown' ||
      val.toLowerCase() === 'user';

    // 1. Check allocations (primary or first)
    if (payment.allocations && payment.allocations.length > 0) {
      const primary = payment.allocations.find((a) => a.is_primary) || payment.allocations[0];
      if (primary) {
        if (!isGenericStaff(primary.employee_name)) {
          const matchedUser = users.find(
            (u) => (primary.employee_id && u.id === primary.employee_id) || u.name.toLowerCase() === primary.employee_name?.toLowerCase()
          );
          return {
            name: primary.employee_name!.trim(),
            role: matchedUser?.designation || (matchedUser?.role === 'admin' ? 'Admin' : matchedUser?.role === 'manager' ? 'Manager' : 'Sales Executive'),
            initials: primary.employee_name!.trim().slice(0, 2).toUpperCase(),
            isShared: payment.allocations.length > 1,
            shareCount: payment.allocations.length,
          };
        }
        if (primary.employee_id) {
          const matched = users.find((u) => u.id === primary.employee_id);
          if (matched && matched.name && !isGenericStaff(matched.name)) {
            return {
              name: matched.name.trim(),
              role: matched.designation || (matched.role === 'admin' ? 'Admin' : matched.role === 'manager' ? 'Manager' : 'Sales Executive'),
              initials: matched.name.trim().slice(0, 2).toUpperCase(),
              isShared: payment.allocations.length > 1,
              shareCount: payment.allocations.length,
            };
          }
        }
      }
    }

    // 2. Check payment.employee_id in users
    if (payment.employee_id) {
      const matched = users.find((u) => u.id === payment.employee_id);
      if (matched && matched.name && !isGenericStaff(matched.name)) {
        return {
          name: matched.name.trim(),
          role: matched.designation || (matched.role === 'admin' ? 'Admin' : matched.role === 'manager' ? 'Manager' : 'Sales Executive'),
          initials: matched.name.trim().slice(0, 2).toUpperCase(),
          isShared: Boolean(payment.is_shared),
          shareCount: 1,
        };
      }
    }

    // 3. Check submitted_by_employee_id in users
    if (payment.submitted_by_employee_id) {
      const matched = users.find((u) => u.id === payment.submitted_by_employee_id);
      if (matched && matched.name && !isGenericStaff(matched.name)) {
        return {
          name: matched.name.trim(),
          role: matched.designation || (matched.role === 'admin' ? 'Admin' : matched.role === 'manager' ? 'Manager' : 'Sales Executive'),
          initials: matched.name.trim().slice(0, 2).toUpperCase(),
          isShared: Boolean(payment.is_shared),
          shareCount: 1,
        };
      }
    }

    // 4. Check candidate string (payment.employee_name or payment.submitted_by_employee_name)
    const rawEmp = (payment.employee_name || payment.submitted_by_employee_name || '').trim();
    if (!isGenericStaff(rawEmp)) {
      const matchedUser = users.find((u) => u.name.toLowerCase() === rawEmp.toLowerCase());
      return {
        name: rawEmp,
        role: matchedUser?.designation || (matchedUser?.role === 'admin' ? 'Admin' : matchedUser?.role === 'manager' ? 'Manager' : 'Sales Executive'),
        initials: rawEmp.slice(0, 2).toUpperCase(),
        isShared: Boolean(payment.is_shared),
        shareCount: 1,
      };
    }

    // 5. Parse payment.remarks for allocation or staff name
    if (typeof payment.remarks === 'string') {
      const allocMatch = payment.remarks.match(/Allocations:\s*([^:\(\n,]+)/i);
      if (allocMatch && allocMatch[1].trim() && !isGenericStaff(allocMatch[1].trim())) {
        const parsedName = allocMatch[1].trim();
        const matchedUser = users.find((u) => u.name.toLowerCase() === parsedName.toLowerCase());
        return {
          name: parsedName,
          role: matchedUser?.designation || 'Sales Executive',
          initials: parsedName.slice(0, 2).toUpperCase(),
          isShared: Boolean(payment.is_shared),
          shareCount: 1,
        };
      }

      const staffMatch = payment.remarks.match(/(?:Staff|Employee|Executive|Agent|Submitted by)\s*:\s*([^\n;,]+)/i);
      if (staffMatch && staffMatch[1].trim() && !isGenericStaff(staffMatch[1].trim())) {
        const parsedName = staffMatch[1].trim();
        const matchedUser = users.find((u) => u.name.toLowerCase() === parsedName.toLowerCase());
        return {
          name: parsedName,
          role: matchedUser?.designation || 'Sales Executive',
          initials: parsedName.slice(0, 2).toUpperCase(),
          isShared: Boolean(payment.is_shared),
          shareCount: 1,
        };
      }
    }

    // 6. Cross-reference Active Traders
    if (payment.trader_id || payment.client_phone || payment.client_name) {
      const cleanPhone = (payment.client_phone || '').replace(/\D/g, '');
      const matchedTrader = traders.find((t) => {
        if (payment.trader_id && t.id === payment.trader_id) return true;
        if (cleanPhone && t.phone && t.phone.replace(/\D/g, '') === cleanPhone) return true;
        if (payment.client_name && t.name && t.name.toLowerCase() === payment.client_name.toLowerCase()) return true;
        return false;
      });

      if (matchedTrader) {
        if (matchedTrader.employee_id) {
          const matched = users.find((u) => u.id === matchedTrader.employee_id);
          if (matched && matched.name && !isGenericStaff(matched.name)) {
            return {
              name: matched.name.trim(),
              role: matched.designation || (matched.role === 'admin' ? 'Admin' : matched.role === 'manager' ? 'Manager' : 'Sales Executive'),
              initials: matched.name.trim().slice(0, 2).toUpperCase(),
              isShared: Boolean(payment.is_shared),
              shareCount: 1,
            };
          }
        }
        if (!isGenericStaff(matchedTrader.employee_name)) {
          return {
            name: matchedTrader.employee_name!.trim(),
            role: 'Sales Executive',
            initials: matchedTrader.employee_name!.trim().slice(0, 2).toUpperCase(),
            isShared: Boolean(payment.is_shared),
            shareCount: 1,
          };
        }
      }
    }

    // 7. Cross-reference Leads
    if (payment.client_phone || payment.client_name) {
      const cleanPhone = (payment.client_phone || '').replace(/\D/g, '');
      const matchedLead = leads.find((l) => {
        if (cleanPhone && l.phone && l.phone.replace(/\D/g, '') === cleanPhone) return true;
        if (payment.client_name && l.name && l.name.toLowerCase() === payment.client_name.toLowerCase()) return true;
        return false;
      });

      if (matchedLead) {
        if (matchedLead.assigned_to) {
          const matched = users.find((u) => u.id === matchedLead.assigned_to);
          if (matched && matched.name && !isGenericStaff(matched.name)) {
            return {
              name: matched.name.trim(),
              role: matched.designation || 'Sales Executive',
              initials: matched.name.trim().slice(0, 2).toUpperCase(),
              isShared: Boolean(payment.is_shared),
              shareCount: 1,
            };
          }
        }
        if (!isGenericStaff(matchedLead.assigned_to_name)) {
          return {
            name: matchedLead.assigned_to_name!.trim(),
            role: 'Sales Executive',
            initials: matchedLead.assigned_to_name!.trim().slice(0, 2).toUpperCase(),
            isShared: Boolean(payment.is_shared),
            shareCount: 1,
          };
        }
      }
    }

    // 8. Fallback to Direct Head Office
    return {
      name: 'Direct Head Office',
      role: 'Head Office',
      initials: 'HO',
      isShared: Boolean(payment.is_shared),
      shareCount: 1,
    };
  };

  // Interactive Filter and Search States
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_verification' | 'approved' | 'rejected' | 'shared'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc');

  // Format transaction date for institutional financial presentation
  const formatTransactionDate = (dateStr?: string) => {
    if (!dateStr) return { day: '--', month: '---', year: '----', time: '--:--', full: 'N/A', weekday: '---' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '--', month: '---', year: '----', time: '--:--', full: dateStr, weekday: '---' };

    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear().toString();
    const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const full = `${day} ${month} ${year}`;
    const weekday = d.toLocaleString('en-US', { weekday: 'short' });

    return { day, month, year, time, full, weekday, rawTime: d.getTime() };
  };

  // Month filter options extracted from payments
  const monthFilterOptions = useMemo(() => {
    const monthsMap = new Map<string, { label: string; count: number }>();
    payments.forEach((p) => {
      if (p.transaction_time) {
        const d = new Date(p.transaction_time);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          const existing = monthsMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            monthsMap.set(key, { label, count: 1 });
          }
        }
      }
    });
    return Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({ key, label: val.label, count: val.count }));
  }, [payments]);

  // Unique list of employees for filtering dropdown
  const employeeFilterOptions = useMemo(() => {
    const empMap = new Map<string, number>();
    payments.forEach((p) => {
      const emp = resolveEmployeeContact(p);
      if (emp.name && emp.name !== 'Direct Head Office') {
        empMap.set(emp.name, (empMap.get(emp.name) || 0) + 1);
      }
    });
    users.forEach((u) => {
      if ((u.role === 'employee' || u.role === 'admin' || u.role === 'manager') && u.name) {
        if (!empMap.has(u.name)) {
          empMap.set(u.name, 0);
        }
      }
    });
    return Array.from(empMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [payments, users, traders, leads]);

  // Table Row Inline Client Edit State
  const [inlineEditPaymentId, setInlineEditPaymentId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [inlineSuccessId, setInlineSuccessId] = useState<string | null>(null);

  // Inline Client Edit state in Drawer
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [clientSaveSuccess, setClientSaveSuccess] = useState<string | null>(null);

  // Anti-fraud Checklist state
  const [checklist, setChecklist] = useState({
    utrVerified: false,
    amountMatches: false,
    timeMatches: false,
    senderMatches: false,
  });

  const handleOpenDrawer = (payment: Payment) => {
    setSelectedPayment(payment);
    const resolved = resolveClientContact(payment);
    setEditClientName(resolved.hasSpecificName ? resolved.name : (payment.client_name || payment.trader_name || ''));
    setEditClientPhone(resolved.phone);
    setIsEditingClient(false);
    setClientSaveSuccess(null);
    setChecklist({ utrVerified: false, amountMatches: false, timeMatches: false, senderMatches: false });
    setShowRejectInput(false);
    setRejectionRemarks('');
  };

  const handleSaveClientDetails = async () => {
    if (!selectedPayment) return;
    setIsSavingClient(true);
    try {
      await updatePaymentClientDetails(selectedPayment.id, editClientName, editClientPhone);
      setSelectedPayment((prev) => prev ? {
        ...prev,
        client_name: editClientName.trim(),
        client_phone: editClientPhone.trim(),
        trader_name: editClientName.trim(),
        trader_phone: editClientPhone.trim(),
      } : null);
      setClientSaveSuccess('Client details updated in database!');
      setIsEditingClient(false);
      setTimeout(() => setClientSaveSuccess(null), 3000);
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleApprove = () => {
    if (!selectedPayment) return;
    verifyPayment(selectedPayment.id, true, 'Approved after anti-fraud UTR check.');
    setSelectedPayment(null);
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment || !rejectionRemarks.trim()) return;

    verifyPayment(selectedPayment.id, false, rejectionRemarks);
    setSelectedPayment(null);
  };

  const handleStartInlineEdit = (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditPaymentId(payment.id);
    const resolved = resolveClientContact(payment);
    setInlineName(resolved.hasSpecificName ? resolved.name : (payment.client_name || payment.trader_name || ''));
    setInlinePhone(resolved.phone);
  };

  const handleSaveInlineEdit = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inlineName.trim()) return;
    setIsInlineSaving(true);
    try {
      await updatePaymentClientDetails(paymentId, inlineName.trim(), inlinePhone.trim());
      setInlineSuccessId(paymentId);
      setInlineEditPaymentId(null);
      setTimeout(() => setInlineSuccessId(null), 2500);
    } finally {
      setIsInlineSaving(false);
    }
  };

  const handleCancelInlineEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditPaymentId(null);
  };

  // Memoized KPI metrics (deduplicated by UTR)
  const stats = useMemo(() => {
    // Defense-in-depth: deduplicate payments by normalized UTR
    const seenUtrs = new Set<string>();
    const uniquePayments = payments.filter((p) => {
      const norm = (p.utr || '').trim().toLowerCase();
      if (!norm || norm === 'manual' || norm === 'cash' || norm === 'n/a') return true;
      if (seenUtrs.has(norm)) return false;
      seenUtrs.add(norm);
      return true;
    });

    const totalCount = uniquePayments.length;
    const totalAmount = uniquePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pending = uniquePayments.filter((p) => p.status === 'pending_verification');
    const approved = uniquePayments.filter((p) => p.status === 'approved');
    const rejected = uniquePayments.filter((p) => p.status === 'rejected');
    const shared = uniquePayments.filter((p) => Boolean(p.is_shared || (p.allocations && p.allocations.length > 1)));

    return {
      totalCount,
      totalAmount,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      rejectedCount: rejected.length,
      rejectedAmount: rejected.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      sharedCount: shared.length,
      sharedAmount: shared.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    };
  }, [payments]);

  // Memoized filtered payments based on interactive filters and search
  const filteredPayments = useMemo(() => {
    const result = payments.filter((payment: Payment) => {
      // 1. Status Filter
      if (statusFilter === 'shared') {
        const isShared = Boolean(payment.is_shared || (payment.allocations && payment.allocations.length > 1));
        if (!isShared) return false;
      } else if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      // 2. Payment Mode Filter
      if (modeFilter !== 'all' && payment.payment_mode !== modeFilter) {
        return false;
      }

      // 3. Employee Filter
      if (employeeFilter !== 'all') {
        const emp = resolveEmployeeContact(payment);
        const matchesMain = emp.name.toLowerCase() === employeeFilter.toLowerCase();
        const matchesAlloc = (payment.allocations || []).some(
          (a) => (a.employee_name || '').toLowerCase() === employeeFilter.toLowerCase()
        );
        if (!matchesMain && !matchesAlloc) {
          return false;
        }
      }

      // 4. Month Filter
      if (monthFilter !== 'all') {
        if (!payment.transaction_time) return false;
        const d = new Date(payment.transaction_time);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const resolvedClient = resolveClientContact(payment);
        const resolvedEmp = resolveEmployeeContact(payment);
        const clientName = resolvedClient.name.toLowerCase();
        const phone = resolvedClient.phone.toLowerCase();
        const empName = resolvedEmp.name.toLowerCase();
        const utr = (payment.utr || '').toLowerCase();
        const allocEmps = (payment.allocations || []).map((a) => a.employee_name || '').join(' ').toLowerCase();
        const mode = (payment.payment_mode || '').toLowerCase();
        const cat = (payment.service_category || '').toLowerCase();
        const srv = (payment.service_type || '').toLowerCase();
        const amt = String(payment.amount || '');
        const dateStr = payment.transaction_time || '';

        return (
          clientName.includes(q) ||
          phone.includes(q) ||
          empName.includes(q) ||
          allocEmps.includes(q) ||
          utr.includes(q) ||
          mode.includes(q) ||
          cat.includes(q) ||
          srv.includes(q) ||
          amt.includes(q) ||
          dateStr.includes(q)
        );
      }

      return true;
    });

    // Defense-in-depth: Deduplicate by normalized UTR (prioritizing approved status, then earlier date)
    const utrMap = new Map<string, Payment>();
    const dedupedResult: Payment[] = [];

    result.forEach((p) => {
      const norm = (p.utr || '').trim().toLowerCase();
      if (!norm || norm === 'manual' || norm === 'cash' || norm === 'n/a') {
        dedupedResult.push(p);
        return;
      }

      if (!utrMap.has(norm)) {
        utrMap.set(norm, p);
        dedupedResult.push(p);
      } else {
        const existing = utrMap.get(norm)!;
        if (existing.status !== 'approved' && p.status === 'approved') {
          const idx = dedupedResult.findIndex((item) => item.id === existing.id);
          if (idx !== -1) dedupedResult[idx] = p;
          utrMap.set(norm, p);
        }
      }
    });

    // Sort in ascending order (1st of the month to end of the month) by default, with toggle support
    return dedupedResult.sort((a: Payment, b: Payment) => {
      const timeA = new Date(a.transaction_time).getTime() || 0;
      const timeB = new Date(b.transaction_time).getTime() || 0;
      return dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [payments, statusFilter, modeFilter, employeeFilter, monthFilter, searchQuery, dateSortOrder, traders, users, leads]);

  const allChecklistPassed =
    checklist.utrVerified && checklist.amountMatches && checklist.timeMatches && checklist.senderMatches;

  const selectedClientInfo = selectedPayment ? resolveClientContact(selectedPayment) : null;
  const drawerName = selectedClientInfo ? selectedClientInfo.name : '';
  const drawerPhone = selectedClientInfo ? selectedClientInfo.phone : '';
  const cleanDrawerDigits = drawerPhone.replace(/\D/g, '');

  const hasActiveFilters =
    statusFilter !== 'all' ||
    modeFilter !== 'all' ||
    employeeFilter !== 'all' ||
    monthFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Header Bar - Harmonized with CRM Design Language */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
            </div>
            <span>Payment Verification & Anti-Fraud</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Verify bank UTR references, inspect employee payment proofs, and approve revenue credits.
          </p>
        </div>

        {/* Dynamic Verification Queue Status Widget */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {stats.pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => setStatusFilter('pending_verification')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer shadow-xs group"
              title="Click to filter pending reviews"
            >
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>{stats.pendingCount} Needs Review</span>
              <span className="text-[10px] text-amber-600 group-hover:translate-x-0.5 transition-transform font-bold">→</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All Proofs Verified</span>
            </span>
          )}
        </div>
      </div>

      {/* Security Quick Tip */}
      <div className="bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-[11px] font-semibold leading-tight">
          <strong>Anti-Fraud Tip:</strong> Cross-verify UTR & amount in bank app statement before approving proofs.
        </span>
      </div>

      {/* Interactive Search & Filter Command Bar */}
      <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, phone, UTR, staff..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group: Status Dropdown + Mode Dropdown + Reset */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {/* Status Dropdown with Live Counts */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`w-full sm:w-auto appearance-none rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold cursor-pointer transition-all shadow-2xs border ${
                statusFilter !== 'all'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <option value="all">All ({stats.totalCount})</option>
              <option value="pending_verification">Needs Review ({stats.pendingCount})</option>
              <option value="approved">Approved ({stats.approvedCount})</option>
              <option value="rejected">Rejected ({stats.rejectedCount})</option>
              <option value="shared">Shared Splits ({stats.sharedCount})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Employee Filter Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className={`w-full sm:w-auto appearance-none rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold cursor-pointer transition-all shadow-2xs border ${
                employeeFilter !== 'all'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <option value="all">All Employees</option>
              {employeeFilterOptions.map((emp) => (
                <option key={emp.name} value={emp.name}>
                  {emp.name} ({emp.count})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Filter Selector */}
          {monthFilterOptions.length > 0 && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={`w-full sm:w-auto appearance-none rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold cursor-pointer transition-all shadow-2xs border ${
                  monthFilter !== 'all'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <option value="all">All Months</option>
                {monthFilterOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Payment Mode Selector */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className={`w-full sm:w-auto appearance-none rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold cursor-pointer transition-all shadow-2xs border ${
                modeFilter !== 'all'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <option value="all">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 1-Click Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setModeFilter('all');
                setEmployeeFilter('all');
                setMonthFilter('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile View: Payments Card Stack */}
      <div className="md:hidden block space-y-3 font-sans">
        {filteredPayments.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-sm text-slate-800">
                {hasActiveFilters ? 'No matching payment records found' : 'No payment records found'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasActiveFilters
                  ? 'Try adjusting your search query, status tab, or payment mode.'
                  : 'Employee-submitted payment proofs will appear here automatically.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setModeFilter('all');
                  setEmployeeFilter('all');
                  setMonthFilter('all');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        ) : (
          filteredPayments.map((payment) => {
            const clientInfo = resolveClientContact(payment);
            const empInfo = resolveEmployeeContact(payment);
            const displayName = clientInfo.name;
            const displayPhone = clientInfo.phone;
            const cleanPhoneDigits = displayPhone.replace(/\D/g, '');
            const isEditing = inlineEditPaymentId === payment.id;

            return (
              <div
                key={payment.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3.5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all font-sans"
              >
                {/* Card Top: Amount & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      {formatINR(payment.amount)}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {payment.payment_mode}
                    </span>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>

                {/* Client Profile Row with 1-Tap Quick Actions */}
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="bg-blue-50/90 p-3 rounded-2xl border border-blue-200 space-y-2">
                    <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                      Edit Client Information
                    </span>
                    <input
                      type="text"
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      placeholder="Client Full Name"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="tel"
                      value={inlinePhone}
                      onChange={(e) => setInlinePhone(e.target.value)}
                      placeholder="Client Phone (10 digits)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelInlineEdit}
                        className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isInlineSaving || !inlineName.trim()}
                        onClick={(e) => handleSaveInlineEdit(payment.id, e)}
                        className="px-3.5 py-1 rounded-xl text-xs font-bold text-white bg-blue-600 flex items-center gap-1 shadow-sm"
                      >
                        {isInlineSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                        {(displayName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-black leading-tight ${clientInfo.hasSpecificName ? 'text-slate-900' : 'text-amber-800'}`}>
                            {displayName}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => handleStartInlineEdit(payment, e)}
                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                            title="Edit Client"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 block mt-0.5">
                          {displayPhone || 'No phone recorded'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cleanPhoneDigits.length >= 10 && (
                        <>
                          <a
                            href={`https://wa.me/91${cleanPhoneDigits.slice(-10)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                            title="WhatsApp Client"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`tel:+91${cleanPhoneDigits.slice(-10)}`}
                            className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                            title="Call Client"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Data Strip with 1-Tap UTR Copy */}
                <div className="space-y-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-100 text-xs">
                  {/* UTR Reference with instant copy button */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">UTR / Ref Number</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(payment.utr);
                        setCopiedUtrId(payment.id);
                        setTimeout(() => setCopiedUtrId(null), 1800);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 font-mono text-[11px] font-bold text-slate-800 cursor-pointer shadow-2xs"
                      title="Click to copy UTR to paste into bank app"
                    >
                      <span>{payment.utr}</span>
                      {copiedUtrId === payment.id ? (
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Staff Allocation */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Staff Assigned</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <span>{empInfo.name}</span>
                      {empInfo.isShared && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Shared ({empInfo.shareCount})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Service Package & Duration if available */}
                  {payment.service_category && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Package</span>
                      <span className="font-semibold text-slate-800">
                        {payment.service_category} {payment.subscription_duration ? `• ${payment.subscription_duration}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Transaction Date */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>Transaction Date</span>
                    </span>
                    {(() => {
                      const tx = formatTransactionDate(payment.transaction_time);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200/80 font-black text-blue-900 text-[11px]">
                            {tx.day} {tx.month} {tx.year}
                          </span>
                          <span className="text-slate-500 text-[10px] font-medium">
                            {tx.time}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Screenshot Proof Preview Thumbnail */}
                {payment.screenshot_url && (
                  <div
                    onClick={() => handleOpenDrawer(payment)}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-28 flex items-center justify-center cursor-pointer group"
                  >
                    <img
                      src={payment.screenshot_url}
                      alt="Proof"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center gap-1.5 text-white font-bold text-xs opacity-90 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-4 h-4" />
                      <span>Tap to Inspect Proof</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDrawer(payment)}
                    className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98 ${
                      payment.status === 'pending_verification'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {payment.status === 'pending_verification' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Approve</span>
                      </>
                    ) : (
                      <span>Inspect Log</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentToDelete(payment)}
                    className="p-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    title="Delete Transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View: Heavy Table with guaranteed widths to prevent column overriding */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-xs">
            <colgroup>
              <col className="w-[18%] min-w-[160px]" />
              <col className="w-[13%] min-w-[125px]" />
              <col className="w-[11%] min-w-[95px]" />
              <col className="w-[12%] min-w-[110px]" />
              <col className="w-[12%] min-w-[110px]" />
              <col className="w-[11%] min-w-[105px]" />
              <col className="w-[10%] min-w-[105px]" />
              <col className="w-[8%] min-w-[85px]" />
              <col className="w-[5%] min-w-[55px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3 px-3 text-slate-500 font-bold">Client</th>
                <th className="py-3 px-2 text-slate-500 font-bold">Employee</th>
                <th className="py-3 px-2 text-slate-500 font-bold">Amount</th>
                <th className="py-3 px-2 text-slate-500 font-bold">Service</th>
                <th className="py-3 px-2 text-slate-500 font-bold">Mode / UTR</th>
                <th
                  className="py-3 px-2 text-slate-600 cursor-pointer hover:bg-slate-100/70 transition-colors select-none font-bold"
                  onClick={() => setDateSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title={`Click to sort by date (${dateSortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-700">Date</span>
                    <span className="text-xs text-blue-600 font-black">
                      {dateSortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-2 text-center text-slate-500 font-bold">Status</th>
                <th className="py-3 px-2 text-center text-slate-500 font-bold">Action</th>
                <th className="py-3 px-1.5 text-center text-slate-500 font-bold text-[9px] uppercase tracking-wider">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-black text-sm text-slate-800 block">
                          {hasActiveFilters ? 'No matching payment records found' : 'No payment records found'}
                        </span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {hasActiveFilters
                            ? 'Try adjusting your search query, status tab, or payment mode.'
                            : 'Employee-submitted payment proofs will appear here automatically.'}
                        </span>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all');
                            setModeFilter('all');
                            setSearchQuery('');
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const clientInfo = resolveClientContact(payment);
                  const empInfo = resolveEmployeeContact(payment);
                  const displayName = clientInfo.name;
                  const displayPhone = clientInfo.phone;
                  const cleanPhoneDigits = displayPhone.replace(/\D/g, '');
                  const isEditingThisRow = inlineEditPaymentId === payment.id;
                  const isSuccessThisRow = inlineSuccessId === payment.id;

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-all border-b border-slate-100/60 group">
                      <td className="py-2.5 px-2.5">
                        {isEditingThisRow ? (
                          /* Interactive Inline Row Editor */
                          <div className="bg-blue-50/95 border border-blue-200/90 p-2 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-extrabold text-blue-900 uppercase tracking-wide">
                                Edit Client
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={inlineName}
                              onChange={(e) => setInlineName(e.target.value)}
                              placeholder="Client Name"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                              autoFocus
                            />
                            <input
                              type="tel"
                              value={inlinePhone}
                              onChange={(e) => setInlinePhone(e.target.value)}
                              placeholder="Phone (10 digits)"
                              className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                            />
                            <div className="flex justify-end gap-1 pt-0.5">
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="px-2 py-0.5 rounded border border-slate-200 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isInlineSaving || !inlineName.trim()}
                                onClick={(e) => handleSaveInlineEdit(payment.id, e)}
                                className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {isInlineSaving ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                )}
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Interactive Display without avatar box to maximize space */
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span
                                className={`font-bold text-xs truncate max-w-[110px] sm:max-w-[130px] ${
                                  clientInfo.hasSpecificName ? 'text-slate-900' : 'text-amber-800'
                                }`}
                                title={displayName}
                              >
                                {displayName}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleStartInlineEdit(payment, e)}
                                className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                                title="Quick edit client details"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {!clientInfo.hasSpecificName && (
                                <button
                                  type="button"
                                  onClick={(e) => handleStartInlineEdit(payment, e)}
                                  className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1 py-0.2 rounded cursor-pointer shrink-0"
                                >
                                  + Name
                                </button>
                              )}
                              {isSuccessThisRow && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0 animate-in fade-in">
                                  Saved!
                                </span>
                              )}
                            </div>

                            {displayPhone ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[11px] text-slate-500 font-mono font-medium truncate">
                                  {displayPhone}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(displayPhone);
                                    setCopiedPhoneId(payment.id);
                                    setTimeout(() => setCopiedPhoneId(null), 1800);
                                  }}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                  title="Copy phone number"
                                >
                                  {copiedPhoneId === payment.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                                {cleanPhoneDigits.length >= 10 && (
                                  <>
                                    <a
                                      href={`https://wa.me/91${cleanPhoneDigits.slice(-10)}?text=Hello%20${encodeURIComponent(displayName)}%2C%20greetings%20from%20Time2Trade.%20Your%20payment%20proof%20has%20been%20received.`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                                      title="Chat on WhatsApp"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5" />
                                    </a>
                                    <a
                                      href={`tel:+91${cleanPhoneDigits.slice(-10)}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                                      title="Call Client"
                                    >
                                      <PhoneCall className="w-2.5 h-2.5" />
                                    </a>
                                  </>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleStartInlineEdit(payment, e)}
                                className="text-[9px] text-blue-700 font-bold bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-1.5 py-0.2 rounded mt-0.5 cursor-pointer inline-flex items-center gap-1 transition-colors"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>+ Phone</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block text-xs truncate" title={empInfo.name}>
                            {empInfo.name}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium truncate">
                              {empInfo.role}
                            </span>
                            {empInfo.isShared && (
                              <span className="text-[8px] font-extrabold px-1 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                Shared ({empInfo.shareCount})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="min-w-0">
                          <span className="font-extrabold text-emerald-700 block text-xs whitespace-nowrap">
                            {formatINR(payment.amount)}
                          </span>
                          {payment.allocations && payment.allocations.length > 1 ? (
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 mt-0.5 truncate">
                              Shared ({payment.allocations.length})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block truncate">Single staff</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        {payment.service_category ? (
                          <div className="min-w-0">
                            <span
                              className="font-bold text-slate-800 block text-xs truncate"
                              title={`${payment.service_category} • ${payment.service_type}`}
                            >
                              {payment.service_category} • {payment.service_type === 'Future Option' ? 'Option' : payment.service_type}
                            </span>
                            <span className="text-[10px] font-medium text-teal-600 block truncate">
                              {payment.subscription_duration}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="min-w-0">
                          <span className="text-slate-700 font-semibold block text-xs truncate">
                            {payment.payment_mode}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-slate-500 text-[10px] truncate max-w-[80px]" title={payment.utr}>
                              {payment.utr}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(payment.utr);
                                setCopiedUtrId(payment.id);
                                setTimeout(() => setCopiedUtrId(null), 1800);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer shrink-0 transition-colors"
                              title="Copy UTR"
                            >
                              {copiedUtrId === payment.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        {(() => {
                          const tx = formatTransactionDate(payment.transaction_time);
                          return (
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 block text-xs truncate">
                                {tx.day} {tx.month} {tx.year}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{tx.weekday} • {tx.time}</span>
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center">
                          {payment.status === 'pending_verification' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>Pending</span>
                            </span>
                          ) : payment.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap">
                              <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleOpenDrawer(payment)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                              payment.status === 'pending_verification'
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20 shadow-sm'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                          >
                            {payment.status === 'pending_verification' ? 'Verify' : 'Inspect'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentToDelete(payment);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Delete transaction (Admin & Google Sheets)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anti-Fraud Inspection Drawer */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end font-sans">
            <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 p-4 sm:p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250 z-50 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#091A2F]">Payment Verification Drawer</h3>
                  <p className="text-xs text-slate-500 font-medium">Ref / UTR: {selectedPayment.utr}</p>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Interactive Client Information Banner with Inline Edit */}
              <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/20">
                      {(drawerName || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-sm font-black leading-tight ${selectedClientInfo?.hasSpecificName ? 'text-slate-900' : 'text-amber-800'}`}>
                          {drawerName}
                        </h4>
                        {!selectedClientInfo?.hasSpecificName && !isEditingClient && (
                          <button
                            type="button"
                            onClick={() => setIsEditingClient(true)}
                            className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            + Set Name
                          </button>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-700 block mt-0.5">
                        {drawerPhone || 'No phone recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {drawerPhone && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(drawerPhone);
                            setCopiedPhoneId(selectedPayment.id);
                            setTimeout(() => setCopiedPhoneId(null), 1800);
                          }}
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                          title="Copy Phone"
                        >
                          {copiedPhoneId === selectedPayment.id ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {cleanDrawerDigits.length >= 10 && (
                          <a
                            href={`https://wa.me/91${cleanDrawerDigits.slice(-10)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-2xs"
                            title="WhatsApp Client"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </>
                    )}
                  <button
                    type="button"
                    onClick={() => setIsEditingClient(!isEditingClient)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingClient ? 'Close' : 'Edit Details'}</span>
                  </button>
                </div>
              </div>

              {clientSaveSuccess && (
                <div className="p-2 rounded-xl bg-emerald-100/90 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{clientSaveSuccess}</span>
                </div>
              )}

              {((selectedPayment.client_name?.toLowerCase() === 'bhanu reddy' || selectedPayment.trader_name?.toLowerCase() === 'bhanu reddy') && selectedPayment.utr === '314118925832') && !isEditingClient && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-amber-800">Sample Client Profile Detected:</span>
                    This transaction inherited the initial sample client details (&quot;Bhanu Reddy&quot;). Click <button type="button" onClick={() => setIsEditingClient(true)} className="text-blue-700 underline font-bold cursor-pointer">Edit Details</button> to enter the client&apos;s real name and phone.
                  </div>
                </div>
              )}

              {/* Inline Editor Drawer Module */}
              {isEditingClient && (
                <div className="pt-3 border-t border-blue-200/60 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        Client Legal Name
                      </label>
                      <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                        placeholder="Client Full Name"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        Client Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editClientPhone}
                        onChange={(e) => setEditClientPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingClient(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingClient || !editClientName.trim()}
                      onClick={handleSaveClientDetails}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingClient ? 'Saving...' : 'Save & Sync'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Screenshot Viewer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Submitted Payment Proof</span>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-blue-600" /> {isZoomed ? 'Zoom Out' : 'Zoom In'}
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex justify-center">
                <img
                  src={selectedPayment.screenshot_url}
                  alt="Payment Screenshot Proof"
                  className={`object-contain transition-all duration-300 ${
                    isZoomed ? 'max-h-none scale-125 my-10' : 'max-h-64'
                  }`}
                />
              </div>
            </div>

            {/* Transaction Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div>
                <span className="text-slate-500 block">Claimed Amount</span>
                <span className="font-extrabold text-emerald-700 text-base">{formatINR(selectedPayment.amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">UTR / Ref Number</span>
                <span className="font-mono font-bold text-slate-800">{selectedPayment.utr}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Mode</span>
                <span className="font-bold text-slate-700">{selectedPayment.payment_mode}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Receiver Bank Holder Name</span>
                <span className="font-bold text-slate-800">{selectedPayment.receiver_bank_name || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Transaction Date & Time</span>
                {(() => {
                  const tx = formatTransactionDate(selectedPayment.transaction_time);
                  return (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-black text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{tx.day} {tx.month} {tx.year} ({tx.weekday})</span>
                      </span>
                      <span className="text-slate-600 font-bold text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tx.time}</span>
                      </span>
                    </div>
                  );
                })()}
              </div>
              {selectedPayment.service_category && (
                <div className="col-span-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Package</span>
                    <span className="font-bold text-slate-800">
                      {selectedPayment.service_category} • {selectedPayment.service_type === 'Future Option' ? 'Option' : (selectedPayment.service_type || 'Option')}
                    </span>
                  </div>
                  {selectedPayment.subscription_duration && (
                    <span className="px-2 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                      {selectedPayment.subscription_duration}
                    </span>
                  )}
                </div>
              )}
              {selectedPayment.remarks && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Form Remarks & Notes</span>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 whitespace-pre-line font-medium">
                    {selectedPayment.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Employee Allocation Breakdown */}
            {selectedPayment.allocations && selectedPayment.allocations.length > 0 ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Staff Sales Allocation ({selectedPayment.allocations.length} Staff)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedPayment.allocations.length > 1 ? 'Shared Payment' : 'Single Staff'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {selectedPayment.allocations.map((alloc) => {
                    const matchedUser = users.find(
                      (u) => (alloc.employee_id && u.id === alloc.employee_id) || u.name.toLowerCase() === alloc.employee_name?.toLowerCase()
                    );
                    const displayName = (alloc.employee_name && alloc.employee_name !== 'Staff' && alloc.employee_name !== 'Staff Member')
                      ? alloc.employee_name
                      : (matchedUser?.name || 'Staff');
                    return (
                      <div
                        key={alloc.employee_id || alloc.id}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{displayName}</span>
                              {alloc.is_primary && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                  Primary
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {alloc.employee_code || matchedUser?.employee_code || (alloc.employee_id ? `EMP-${alloc.employee_id.slice(0, 4)}` : 'STAFF')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-700 block">
                            {formatINR(alloc.allocation_amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {alloc.allocation_percentage}% share
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Staff</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {resolveEmployeeContact(selectedPayment).name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {resolveEmployeeContact(selectedPayment).role}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  100% Credit
                </span>
              </div>
            )}

            {/* Verification Checklist */}
            {selectedPayment.status === 'pending_verification' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-amber-700" /> Admin Verification Checklist
                </h4>

                <div className="space-y-2 text-xs">
                  {[
                    { key: 'utrVerified', label: 'UTR matches entry in bank / UPI app statement' },
                    { key: 'amountMatches', label: 'Received amount matches exact claimed value' },
                    { key: 'timeMatches', label: 'Transaction time matches bank log timestamp' },
                    { key: 'senderMatches', label: 'Sender account name matches trader record' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={(checklist as any)[item.key]}
                        onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                        className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 font-semibold">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedPayment.status === 'pending_verification' ? (
              <div className="space-y-3 pt-2">
                {!showRejectInput ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={!allChecklistPassed}
                      className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all border-none ${
                        allChecklistPassed
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10 cursor-pointer active:scale-95'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${allChecklistPassed ? 'text-white' : 'text-slate-400'}`} /> Approve Payment
                    </button>

                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" /> Reject Payment
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReject} className="space-y-3 bg-rose-50/40 p-4 rounded-xl border border-rose-200">
                    <h5 className="text-xs font-bold text-rose-800">Mandatory Rejection Remark</h5>
                    <textarea
                      required
                      rows={2}
                      value={rejectionRemarks}
                      onChange={(e) => setRejectionRemarks(e.target.value)}
                      placeholder="State exact reason for rejection (e.g. UTR not found in bank statement)..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:border-rose-500 shadow-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer border-none"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span className="text-slate-500 block font-bold mb-1">Admin Verification Remarks:</span>
                  <p className="text-slate-800 italic font-medium">{selectedPayment.admin_remarks || 'No remarks provided.'}</p>
                </div>
              </div>
            )}

            {/* Admin Delete Action in Drawer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Record Management</span>
              <button
                type="button"
                onClick={() => setPaymentToDelete(selectedPayment)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Transaction</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Payment Record?</h3>
                <p className="text-xs text-slate-500 font-medium">Permanent Admin Action</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Client:</span>
                <span className="font-bold text-slate-900">{paymentToDelete.client_name || paymentToDelete.trader_name || 'Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="font-extrabold text-emerald-700">{formatINR(paymentToDelete.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">UTR Reference:</span>
                <span className="font-mono font-bold text-slate-700">{paymentToDelete.utr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Staff Assigned:</span>
                <span className="font-semibold text-slate-800">{paymentToDelete.employee_name || 'Direct / Head Office'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-semibold capitalize text-slate-700">{paymentToDelete.status.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Google Sheets & Form Responses Sync:</strong> Deletion will automatically dispatch a signal to remove the row from your Google Sheet and delete the response from your linked Google Form (UTR: <code className="font-mono font-bold text-emerald-800">{paymentToDelete.utr}</code>) to eliminate duplicates.
              </span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Deleting this payment will permanently remove it from the verification queue and any associated sales allocations.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!paymentToDelete) return;
                  setIsDeleting(true);
                  try {
                    await deletePayment(paymentToDelete.id);
                    if (selectedPayment?.id === paymentToDelete.id) {
                      setSelectedPayment(null);
                    }
                    setPaymentToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

