import React, { useState, useMemo } from 'react';
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
  Trash2,
} from 'lucide-react';

export const PaymentVerification: React.FC = () => {
  const { payments, verifyPayment, updatePaymentClientDetails, traders, deletePayment, clearAllPayments } = useAuth();

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

  // Interactive Filter and Search States
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_verification' | 'approved' | 'rejected' | 'shared'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Memoized KPI metrics
  const stats = useMemo(() => {
    const totalCount = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pending = payments.filter((p) => p.status === 'pending_verification');
    const approved = payments.filter((p) => p.status === 'approved');
    const rejected = payments.filter((p) => p.status === 'rejected');
    const shared = payments.filter((p) => Boolean(p.is_shared || (p.allocations && p.allocations.length > 1)));

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
    return payments.filter((payment) => {
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

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const resolved = resolveClientContact(payment);
        const name = resolved.name.toLowerCase();
        const phone = resolved.phone.toLowerCase();
        const utr = (payment.utr || '').toLowerCase();
        const emp = (payment.employee_name || '').toLowerCase();
        const mode = (payment.payment_mode || '').toLowerCase();
        const cat = (payment.service_category || '').toLowerCase();
        const srv = (payment.service_type || '').toLowerCase();
        const amt = String(payment.amount || '');

        return (
          name.includes(q) ||
          phone.includes(q) ||
          utr.includes(q) ||
          emp.includes(q) ||
          mode.includes(q) ||
          cat.includes(q) ||
          srv.includes(q) ||
          amt.includes(q)
        );
      }

      return true;
    });
  }, [payments, statusFilter, modeFilter, searchQuery, traders]);

  const allChecklistPassed =
    checklist.utrVerified && checklist.amountMatches && checklist.timeMatches && checklist.senderMatches;

  const selectedClientInfo = selectedPayment ? resolveClientContact(selectedPayment) : null;
  const drawerName = selectedClientInfo ? selectedClientInfo.name : '';
  const drawerPhone = selectedClientInfo ? selectedClientInfo.phone : '';
  const cleanDrawerDigits = drawerPhone.replace(/\D/g, '');

  const hasActiveFilters = statusFilter !== 'all' || modeFilter !== 'all' || searchQuery.trim() !== '';

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

        {/* Dynamic Verification Queue Status Widget & Reset to Scratch */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {payments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to remove all payment records and reset the portal to scratch? This will delete all current test payments.')) {
                  clearAllPayments();
                  setSelectedPayment(null);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer shadow-xs"
              title="Remove all test payments and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset to Scratch</span>
            </button>
          )}

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
                    <span className="font-bold text-slate-700">
                      {payment.employee_name || 'Staff Member'}
                      {Boolean(payment.is_shared || (payment.allocations && payment.allocations.length > 1)) && (
                        <span className="ml-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Shared
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

                  {/* Submitted Date/Time */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Submitted</span>
                    <span className="text-slate-500 font-medium">
                      {new Date(payment.transaction_time).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
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

                {/* Big Prominent Action Button */}
                <div className="flex items-center gap-2">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete payment record for "${displayName}" (${payment.utr})?`)) {
                        deletePayment(payment.id);
                      }
                    }}
                    className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Delete Payment Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View: Heavy Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3.5 px-4 text-slate-500">Client / Trader</th>
                <th className="py-3.5 px-4 text-slate-500">Amount & Sharing</th>
                <th className="py-3.5 px-4 text-slate-500">Service Package</th>
                <th className="py-3.5 px-4 text-slate-500">Mode & UTR</th>
                <th className="py-3.5 px-4 text-slate-500">Submitted Time</th>
                <th className="py-3.5 px-4 text-slate-500">Status</th>
                <th className="py-3.5 px-4 text-right text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
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
                  const displayName = clientInfo.name;
                  const displayPhone = clientInfo.phone;
                  const cleanPhoneDigits = displayPhone.replace(/\D/g, '');
                  const isEditingThisRow = inlineEditPaymentId === payment.id;
                  const isSuccessThisRow = inlineSuccessId === payment.id;

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/70 transition-all border-b border-slate-100/60 group">
                      <td className="py-3.5 px-4">
                        {isEditingThisRow ? (
                          /* Interactive Inline Row Editor */
                          <div className="bg-blue-50/90 border border-blue-200/90 p-2.5 rounded-xl space-y-2 min-w-[240px] shadow-sm animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wide">
                                Edit Client Details
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={inlineName}
                              onChange={(e) => setInlineName(e.target.value)}
                              placeholder="Client Full Name"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                              autoFocus
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-1 rounded border border-slate-200">
                                +91
                              </span>
                              <input
                                type="tel"
                                value={inlinePhone}
                                onChange={(e) => setInlinePhone(e.target.value)}
                                placeholder="Phone (10 digits)"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isInlineSaving || !inlineName.trim()}
                                onClick={(e) => handleSaveInlineEdit(payment.id, e)}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {isInlineSaving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                )}
                                <span>Save & Sync</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Interactive Display with Quick Actions */
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-blue-500/15 group-hover:scale-105 transition-transform">
                              {(displayName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold block text-xs leading-tight ${clientInfo.hasSpecificName ? 'text-slate-900' : 'text-amber-800'}`}>
                                  {displayName}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartInlineEdit(payment, e)}
                                  className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer transition-colors"
                                  title="Quick edit client details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {!clientInfo.hasSpecificName && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleStartInlineEdit(payment, e)}
                                    className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded cursor-pointer"
                                  >
                                    + Set Name
                                  </button>
                                )}
                                {isSuccessThisRow && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 animate-in fade-in">
                                    Saved!
                                  </span>
                                )}
                              </div>

                              {displayPhone ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] text-slate-600 font-mono font-semibold">
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
                                    className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                    title="Copy phone number"
                                  >
                                    {copiedPhoneId === payment.id ? (
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {cleanPhoneDigits.length >= 10 && (
                                    <>
                                      <a
                                        href={`https://wa.me/91${cleanPhoneDigits.slice(-10)}?text=Hello%20${encodeURIComponent(displayName)}%2C%20greetings%20from%20Time2Trade.%20Your%20payment%20proof%20has%20been%20received.`}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                                        title="Chat on WhatsApp"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </a>
                                      <a
                                        href={`tel:+91${cleanPhoneDigits.slice(-10)}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Call Client"
                                      >
                                        <PhoneCall className="w-3 h-3" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleStartInlineEdit(payment, e)}
                                  className="text-[10px] text-blue-700 font-bold bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded mt-0.5 cursor-pointer inline-flex items-center gap-1 transition-colors"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>+ Attach Phone</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-700 block">{formatINR(payment.amount)}</span>
                        {payment.allocations && payment.allocations.length > 1 ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
                            Shared ({payment.allocations.length} staff)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Single staff</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {payment.service_category ? (
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {payment.service_category} • {payment.service_type === 'Future Option' ? 'Option' : payment.service_type}
                            </span>
                            <span className="text-[10px] font-semibold text-teal-600">
                              {payment.subscription_duration}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-semibold block">{payment.payment_mode}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{payment.utr}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(payment.transaction_time).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDrawer(payment)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-sm ${
                              payment.status === 'pending_verification'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/50 animate-pulse'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {payment.status === 'pending_verification' ? 'Verify Now' : 'Inspect'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete payment record for "${displayName}" (${payment.utr})?`)) {
                                deletePayment(payment.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                <span className="text-slate-500 block">Timestamp</span>
                <span className="text-slate-800 font-bold">{new Date(selectedPayment.transaction_time).toLocaleString()}</span>
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
            {selectedPayment.allocations && selectedPayment.allocations.length > 0 && (
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
                  {selectedPayment.allocations.map((alloc) => (
                    <div
                      key={alloc.employee_id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs flex items-center justify-center">
                          {alloc.employee_name?.slice(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{alloc.employee_name}</span>
                            {alloc.is_primary && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {alloc.employee_code || `EMP-${alloc.employee_id.slice(0, 4)}`}
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
                  ))}
                </div>
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

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete payment record for "${drawerName}" (${selectedPayment.utr})?`)) {
                      deletePayment(selectedPayment.id);
                      setSelectedPayment(null);
                    }
                  }}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Payment Record</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

