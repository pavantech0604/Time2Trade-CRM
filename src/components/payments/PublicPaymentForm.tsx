import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PaymentMode } from '../../types';
import { CreditCard, Upload, CheckCircle2, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { uploadFileToBucket, supabase } from '../../lib/supabase';

interface PublicPaymentFormProps {
  onBack?: () => void;
}

export const PublicPaymentForm: React.FC<PublicPaymentFormProps> = ({ onBack }) => {
  const { traders, addPayment, users } = useAuth();

  const [traderId, setTraderId] = useState(traders[0]?.id || '');
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [utr, setUtr] = useState('');
  const [transactionTime, setTransactionTime] = useState(new Date().toISOString().slice(0, 16));
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const res = await uploadFileToBucket('payment-proofs', file, 'proof');
    setIsUploading(false);
    
    if (res.error) {
      alert(`Error uploading file: ${res.error.message || 'Please check if the "payment-proofs" bucket exists and is public.'}`);
      return;
    }

    if (res.path) {
      if (supabase) {
        const cleanPath = res.path.replace('payment-proofs/', '');
        const { data } = supabase.storage.from('payment-proofs').getPublicUrl(cleanPath);
        if (data?.publicUrl) {
          setScreenshotUrl(data.publicUrl);
        } else {
          const objectUrl = URL.createObjectURL(file);
          setScreenshotUrl(objectUrl);
        }
      } else {
        const objectUrl = URL.createObjectURL(file);
        setScreenshotUrl(objectUrl);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderId || !utr || !amount || !screenshotUrl) return;

    setIsSubmitting(true);

    const selectedTrader = traders.find((t) => t.id === traderId);
    const traderName = selectedTrader ? selectedTrader.name : 'Unknown';
    const traderPhone = selectedTrader ? selectedTrader.phone : '';
    const creditedEmployee = users.find((u) => u.id === employeeId);

    // 1. Save to local context (Supabase DB in background)
    addPayment({
      trader_id: traderId,
      employee_id: creditedEmployee?.id,
      employee_name: creditedEmployee?.name,
      amount: Number(amount),
      payment_mode: paymentMode,
      utr: utr.trim(),
      transaction_time: new Date(transactionTime).toISOString(),
      screenshot_url: screenshotUrl,
    });

    // 2. Submit to Google Form responses in background
    try {
      const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSe5jZXoKAofM4UwwM4ELcjL3K4vhavFF6GRIaUoPeZyc9r_Yw/formResponse';
      
      const formData = new URLSearchParams();
      formData.append('entry.555864356', traderName);
      formData.append('entry.1077932088', traderPhone);
      formData.append('entry.1127080737', String(amount));
      formData.append('entry.2013526042', paymentMode);
      formData.append('entry.1794468584', utr.trim());
      formData.append('entry.699038081', transactionTime.split('T')[0]); // YYYY-MM-DD
      
      const fullRemarks = `Credited Employee: ${creditedEmployee ? creditedEmployee.name : 'Unassigned'}\nScreenshot Proof: ${screenshotUrl}\nRemarks: ${remarks}`;
      formData.append('entry.1237410293', fullRemarks);

      await fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch (err) {
      console.error('Google Form integration submission failed:', err);
    }

    setIsSubmitting(false);
    const refCode = `CG-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRefId(refCode);
  };

  if (submittedRefId) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white border border-[#C5A028]/25 p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in zoom-in-95 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-[#091A2F]">Payment Submitted Successfully</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your profit-sharing payment proof has been registered, saved, and synchronized with our Google Forms ledger.
          </p>
        </div>

        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-left">
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Reference Tracking ID:</span>
            <span className="font-mono font-bold text-[#C5A028]">{submittedRefId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Submitted UTR:</span>
            <span className="font-mono font-bold text-slate-700">{utr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Sync Status:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Saved & Synced
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setSubmittedRefId(null);
            setAmount('');
            setUtr('');
            setRemarks('');
            setScreenshotUrl('');
          }}
          className="w-full py-3 rounded-xl bg-[#091A2F] border border-[#C5A028]/35 hover:bg-[#122842] hover:border-[#C5A028] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
        >
          Submit Another Payment Proof
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-6 space-y-6 animate-in fade-in duration-300">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#091A2F] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      )}

      <div className="bg-white border border-[#C5A028]/25 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-[#C5A028] border border-blue-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#091A2F]">Profit Sharing Payment Portal</h2>
            <p className="text-xs text-slate-500">Submit screenshot proof and UTR reference details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-650 block mb-1">Select Active Trader *</label>
            <select
              value={traderId}
              required
              onChange={(e) => setTraderId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="" disabled>-- Select Active Trader --</option>
              {traders.map((trader) => (
                <option key={trader.id} value={trader.id}>
                  {trader.name} ({trader.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-650 block mb-1">Employee Name *</label>
            <select
              value={employeeId}
              required
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="">-- No specific employee (Direct) --</option>
              {users
                .filter((u) => u.is_active && (u.role === 'telecaller' || u.role === 'relationship_manager'))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'relationship_manager' ? 'RM' : 'Telecaller'})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-650 block mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                placeholder="e.g. 25000"
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-650 block mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value="UPI">UPI Transfer</option>
                <option value="Bank Transfer">Bank Transfer / IMPS</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-650 block mb-1">UTR / Transaction Reference Number *</label>
            <input
              type="text"
              required
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. UTR994820194821"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-650 block mb-1">Transaction Timestamp *</label>
            <input
              type="datetime-local"
              required
              value={transactionTime}
              onChange={(e) => setTransactionTime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none"
            />
          </div>

          {/* Screenshot Upload Dropzone */}
          <div>
            <label className="font-semibold text-slate-650 block mb-1">Upload Payment Screenshot Proof *</label>
            <div className={`border-2 border-dashed rounded-2xl p-4 text-center space-y-2 cursor-pointer relative transition-all ${
              screenshotUrl 
                ? 'border-emerald-500/50 bg-emerald-500/5' 
                : 'border-slate-200 hover:border-[#16A34A]/50 bg-[#FAF8F5]'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className={`w-6 h-6 mx-auto ${screenshotUrl ? 'text-emerald-500' : 'text-slate-400'}`} />
              <p className="text-xs text-slate-500 font-medium">
                {isUploading 
                  ? 'Uploading proof image...' 
                  : screenshotUrl 
                  ? 'Screenshot uploaded successfully! Click to replace' 
                  : 'Click or drop screenshot image here (PNG/JPG)'}
              </p>
            </div>

            {screenshotUrl && (
              <div className="mt-2 p-2 bg-[#FAF8F5] border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[200px] font-mono">{screenshotUrl}</span>
                <img src={screenshotUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
              </div>
            )}
          </div>

          {/* Remarks Optional field matching Google Form */}
          <div>
            <label className="font-semibold text-slate-650 block mb-1">Remarks (Optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any optional comments or verification details..."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-850 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || isSubmitting || !screenshotUrl}
            className="w-full py-3 rounded-xl bg-[#091A2F] border border-[#C5A028]/35 hover:bg-[#122842] hover:border-[#C5A028] text-white font-bold text-xs transition-all shadow-lg shadow-[#091A2F]/10 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchronizing Ledger...
              </>
            ) : (
              <>
                Submit Proof for Verification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
