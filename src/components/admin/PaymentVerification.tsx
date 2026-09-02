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
} from 'lucide-react';

export const PaymentVerification: React.FC = () => {
  const { payments, verifyPayment } = useAuth();

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Anti-fraud Checklist state
  const [checklist, setChecklist] = useState({
    utrVerified: false,
    amountMatches: false,
    timeMatches: false,
    senderMatches: false,
  });

  const handleOpenDrawer = (payment: Payment) => {
    setSelectedPayment(payment);
    setChecklist({ utrVerified: false, amountMatches: false, timeMatches: false, senderMatches: false });
    setShowRejectInput(false);
    setRejectionRemarks('');
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

  const allChecklistPassed =
    checklist.utrVerified && checklist.amountMatches && checklist.timeMatches && checklist.senderMatches;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Payment Verification & Anti-Fraud Center</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Inspect trader profit-sharing payments against bank UPI statement records
        </p>
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

      {/* Mobile View: Payments Card Stack */}
      <div className="md:hidden block space-y-3 font-sans">
        {payments.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center text-slate-500 shadow-sm">
            No payments found.
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm hover:border-[#C5A028]/45 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{payment.trader_name}</h4>
                  <span className="text-[10px] text-slate-550 block font-mono mt-0.5">Ref: {payment.utr}</span>
                </div>
                <StatusBadge status={payment.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-655 bg-slate-50 p-2.5 rounded-2xl border border-slate-150">
                <div>
                  <span className="text-slate-450 uppercase tracking-wider block text-[8.5px] font-bold">Amount</span>
                  <span className="font-extrabold text-emerald-700 block mt-0.5">{formatINR(payment.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase tracking-wider block text-[8.5px] font-bold">Payment Mode</span>
                  <span className="font-bold text-slate-700 block mt-0.5">{payment.payment_mode}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-150">
                  <span className="text-slate-450 uppercase tracking-wider block text-[8.5px] font-bold">Submitted Time</span>
                  <span className="font-medium text-slate-700 block mt-0.5">{new Date(payment.transaction_time).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenDrawer(payment)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
                  payment.status === 'pending_verification'
                    ? 'bg-amber-50 text-amber-700 border border-amber-250 hover:bg-amber-100/50 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {payment.status === 'pending_verification' ? 'Verify Now' : 'Inspect Details'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Heavy Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-655 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3.5 px-4 text-slate-550">Trader Name</th>
                <th className="py-3.5 px-4 text-slate-550">Amount</th>
                <th className="py-3.5 px-4 text-slate-550">Mode</th>
                <th className="py-3.5 px-4 text-slate-550">UTR Reference</th>
                <th className="py-3.5 px-4 text-slate-550">Submitted Time</th>
                <th className="py-3.5 px-4 text-slate-550">Verification Status</th>
                <th className="py-3.5 px-4 text-right text-slate-550">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{payment.trader_name}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">{formatINR(payment.amount)}</td>
                  <td className="py-3.5 px-4 text-slate-655">{payment.payment_mode}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold">{payment.utr}</td>
                  <td className="py-3.5 px-4 text-slate-550">
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
                          ? 'bg-amber-50 text-amber-700 border border-amber-250 hover:bg-amber-100/50 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {payment.status === 'pending_verification' ? 'Verify Now' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anti-Fraud Inspection Drawer */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end font-sans">
          <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250 z-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-[#091A2F]">Payment Verification Drawer</h3>
                <p className="text-xs text-slate-500 font-medium">Trader: {selectedPayment.trader_name}</p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Screenshot Viewer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Submitted Payment Proof</span>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-xs text-blue-600 hover:text-blue-750 flex items-center gap-1 font-bold cursor-pointer"
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
                <span className="font-extrabold text-emerald-750 text-base">{formatINR(selectedPayment.amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">UTR / Ref Number</span>
                <span className="font-mono font-bold text-slate-800">{selectedPayment.utr}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Mode</span>
                <span className="font-bold text-slate-750">{selectedPayment.payment_mode}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp</span>
                <span className="text-slate-800 font-bold">{new Date(selectedPayment.transaction_time).toLocaleString()}</span>
              </div>
            </div>

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
                  <form onSubmit={handleReject} className="space-y-3 bg-rose-50/40 p-4 rounded-xl border border-rose-250">
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
    </div>
  );
};
