import React, { useState } from 'react';
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
  Lock,
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
  Sparkles,
  User as UserIcon,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import {
  formatPaymentsBatchTSV,
  getSavedGoogleSheetsWebhookUrl,
  saveGoogleSheetsWebhookUrl,
  GOOGLE_APPS_SCRIPT_SNIPPET,
  GOOGLE_FORM_VIEW_URL,
} from '../../lib/googleSheets';

export const PaymentVerification: React.FC = () => {
  const { payments, verifyPayment, updatePaymentClientDetails } = useAuth();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Google Sheets / Form Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copiedBatchTSV, setCopiedBatchTSV] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState(() => getSavedGoogleSheetsWebhookUrl());
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const handleCopyAllToSpreadsheet = () => {
    const tsvData = formatPaymentsBatchTSV(payments);
    navigator.clipboard.writeText(tsvData);
    setCopiedBatchTSV(true);
    setTimeout(() => setCopiedBatchTSV(false), 3500);
  };

  // Table Row Inline Client Edit State
  const [inlineEditPaymentId, setInlineEditPaymentId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [inlinePhone, setInlinePhone] = useState('');
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [inlineSuccessId, setInlineSuccessId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    setEditClientName(payment.client_name || payment.trader_name || '');
    setEditClientPhone(payment.client_phone || payment.trader_phone || '');
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
    setInlineName(payment.client_name || payment.trader_name || '');
    setInlinePhone(payment.client_phone || payment.trader_phone || '');
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

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (payment.client_name || payment.trader_name || '').toLowerCase();
    const phone = (payment.client_phone || payment.trader_phone || '').toLowerCase();
    const utr = (payment.utr || '').toLowerCase();
    const emp = (payment.employee_name || '').toLowerCase();
    const mode = (payment.payment_mode || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || utr.includes(q) || emp.includes(q) || mode.includes(q);
  });

  const allChecklistPassed =
    checklist.utrVerified && checklist.amountMatches && checklist.timeMatches && checklist.senderMatches;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Payment Verification & Anti-Fraud Center</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Verify and authenticate employee-submitted payment proofs before reflecting in the CRM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllToSpreadsheet}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
              copiedBatchTSV
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Copy all payments as tab-separated values to paste into Google Sheets (Ctrl+V)"
          >
            {copiedBatchTSV ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBatchTSV ? 'Copied to Clipboard!' : 'Copy to Google Sheets (TSV)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Configure Google Sheets Webhook and check Google Form permissions"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sync Setup</span>
          </button>

          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            {filteredPayments.length} Records Found
          </span>
        </div>
      </div>

      {/* Security Guidance Prompt */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed font-medium">
          <span className="font-bold block text-amber-800">Strict Anti-Fraud Security Directive:</span>
          Never approve a payment based solely on the submitted screenshot. Always verify the UTR reference number,
          exact amount, and timestamp directly inside your bank app (HDFC/ICICI/SBI UPI statement).
        </div>
      </div>

      {/* Interactive Search and Filter Bar */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, phone, UTR..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* Mobile View: Payments Card Stack */}
      <div className="md:hidden block space-y-3 font-sans">
        {filteredPayments.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 shadow-sm space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-sm text-slate-700">No matching payments found.</p>
            <p className="text-xs text-slate-400">Employee-submitted payment proofs will appear here automatically.</p>
          </div>
        ) : (
          filteredPayments.map((payment) => {
            const displayName = payment.client_name || payment.trader_name || 'Client';
            const displayPhone = payment.client_phone || payment.trader_phone || '';
            const cleanPhoneDigits = displayPhone.replace(/\D/g, '');
            const isEditing = inlineEditPaymentId === payment.id;

            return (
              <div
                key={payment.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm hover:border-blue-300 transition-colors"
              >
                {/* Client Header in Card */}
                {isEditing ? (
                  <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 space-y-2">
                    <span className="text-[10px] font-bold text-blue-900 uppercase">Quick Edit Client</span>
                    <input
                      type="text"
                      value={inlineName}
                      onChange={(e) => setInlineName(e.target.value)}
                      placeholder="Client Name"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="tel"
                      value={inlinePhone}
                      onChange={(e) => setInlinePhone(e.target.value)}
                      placeholder="Phone (e.g. 9876543210)"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelInlineEdit}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isInlineSaving || !inlineName.trim()}
                        onClick={(e) => handleSaveInlineEdit(payment.id, e)}
                        className="px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        {isInlineSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900">{displayName}</h4>
                          <button
                            type="button"
                            onClick={(e) => handleStartInlineEdit(payment, e)}
                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                            title="Edit client name & phone"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        {displayPhone ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-600 font-mono font-semibold">{displayPhone}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(displayPhone);
                                setCopiedPhoneId(payment.id);
                                setTimeout(() => setCopiedPhoneId(null), 1800);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                              title="Copy phone"
                            >
                              {copiedPhoneId === payment.id ? <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {cleanPhoneDigits.length >= 10 && (
                              <a
                                href={`https://wa.me/91${cleanPhoneDigits.slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleStartInlineEdit(payment, e)}
                            className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-0.5 cursor-pointer"
                          >
                            + Add Phone
                          </button>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Amount</span>
                    <span className="font-black text-emerald-700 block mt-0.5">{formatINR(payment.amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">Payment Mode</span>
                    <span className="font-bold text-slate-700 block mt-0.5">{payment.payment_mode}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 uppercase tracking-wider block text-[8.5px] font-bold">UTR Reference</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">{payment.utr}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDrawer(payment)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
                    payment.status === 'pending_verification'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/50 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {payment.status === 'pending_verification' ? 'Verify Now' : 'Inspect Details'}
                </button>
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold text-sm">No payment records found.</span>
                      <span className="text-xs text-slate-400">Employee-submitted payment proofs will appear here automatically.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const displayName = payment.client_name || payment.trader_name || 'Client';
                  const displayPhone = payment.client_phone || payment.trader_phone || '';
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
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 block text-xs leading-tight">
                                  {displayName}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartInlineEdit(payment, e)}
                                  className="text-slate-300 hover:text-blue-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Quick edit client details"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
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
                    {(selectedPayment.client_name || selectedPayment.trader_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {selectedPayment.client_name || selectedPayment.trader_name || 'Client Name'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-blue-700 block mt-0.5">
                      {selectedPayment.client_phone || selectedPayment.trader_phone || 'No phone recorded'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(selectedPayment.client_phone || selectedPayment.trader_phone) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPayment.client_phone || selectedPayment.trader_phone || '');
                          setCopiedPhoneId(selectedPayment.id);
                          setTimeout(() => setCopiedPhoneId(null), 1800);
                        }}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                        title="Copy Phone"
                      >
                        {copiedPhoneId === selectedPayment.id ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`https://wa.me/91${(selectedPayment.client_phone || selectedPayment.trader_phone || '').replace(/\D/g, '').slice(-10)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-2xs"
                        title="WhatsApp Client"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="text-slate-500 block font-bold mb-1">Admin Verification Remarks:</span>
                <p className="text-slate-800 italic font-medium">{selectedPayment.admin_remarks || 'No remarks provided.'}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Google Sheets & Forms Synchronization Setup Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Google Sheets & Form Synchronization</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Auto-record payment proofs & recover un-reflected responses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Critical Root Cause Explanation & Fix */}
            <div className="bg-rose-50/80 border border-rose-200 p-4 rounded-2xl space-y-2.5 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Why Were Past Submissions Not Appearing in Google Form Responses?</span>
              </div>
              <p className="leading-relaxed">
                Google returned <strong>HTTP 401: Sign in to your Google Account</strong>. When a Google Form has sign-in or response limits enabled, Google blocks all background submissions from external web apps.
              </p>
              <div className="bg-white/80 p-3 rounded-xl border border-rose-200/80 space-y-1.5 text-[11px]">
                <span className="font-bold text-rose-900 uppercase tracking-wider block">Required Fix in your Google Form:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium">
                  <li>Open your Google Form in editor mode (Settings tab &rarr; Responses).</li>
                  <li><strong>Turn OFF &ldquo;Limit to 1 response&rdquo;</strong> (requires respondents to log in).</li>
                  <li><strong>Turn OFF &ldquo;Restrict to users in [Domain]&rdquo;</strong> (blocks outside submissions).</li>
                  <li><strong>Set &ldquo;Collect email addresses&rdquo; to &ldquo;Do not collect&rdquo;</strong>.</li>
                  <li>Ensure there is no &ldquo;File upload&rdquo; question type (CRM already uploads screenshots to cloud CDN).</li>
                </ol>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <a
                  href={GOOGLE_FORM_VIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Form to Verify Settings</span>
                </a>
              </div>
            </div>

            {/* 1-Click Historical TSV Export / Sync */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Instant 1-Click Sync to Google Sheets</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyAllToSpreadsheet}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {copiedBatchTSV ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBatchTSV ? 'Copied All to Clipboard!' : `Copy All ${payments.length} Payments`}</span>
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Click the button above, open your Google Sheet, click on cell <strong>A2</strong> (or the first blank row), and press <strong>Ctrl + V</strong>. All payment proofs, client details, employee allocations, and screenshot URLs will instantly paste with perfect columns!
              </p>
            </div>

            {/* Google Apps Script Webhook */}
            <div className="space-y-3 text-xs text-slate-600">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Automated Google Sheets Webhook (Recommended)
              </h4>
              <p className="text-[11px] leading-relaxed">
                Add this 10-line script to your Google Sheet to auto-record every employee payment proof without requiring any Google sign-in.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Google Apps Script Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveGoogleSheetsWebhookUrl(webhookUrlInput);
                      setWebhookStatus('Webhook URL saved successfully!');
                      setTimeout(() => setWebhookStatus(null), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                  >
                    Save
                  </button>
                </div>
                {webhookStatus && (
                  <p className="text-emerald-600 font-bold text-[11px] mt-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {webhookStatus}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Apps Script Code Snippet:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_SNIPPET);
                      alert('Google Apps Script code copied to clipboard!');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>In Google Sheets, go to <strong>Extensions &rarr; Apps Script</strong>.</li>
                  <li>Paste the code, click <strong>Deploy &rarr; New deployment</strong>.</li>
                  <li>Type: <strong>Web app</strong> (Execute as: <em>Me</em>, Access: <em>Anyone</em>).</li>
                  <li>Copy Web app URL and paste it above!</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
