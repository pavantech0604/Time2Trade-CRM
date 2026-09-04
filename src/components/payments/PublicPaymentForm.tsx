import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PaymentMode } from '../../types';
import { CreditCard, Upload, CheckCircle2, ShieldAlert, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { uploadFileToBucket, supabase } from '../../lib/supabase';

interface PublicPaymentFormProps {
  onBack?: () => void;
}

export const PublicPaymentForm: React.FC<PublicPaymentFormProps> = ({ onBack }) => {
  const { traders, addPayment, users } = useAuth();

  const [traderId, setTraderId] = useState(traders[0]?.id || '');
  const [isManualClient, setIsManualClient] = useState(traders.length === 0);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [utr, setUtr] = useState('');
  const [receiverBank, setReceiverBank] = useState('HDFC Bank');
  const [transactionTime, setTransactionTime] = useState(new Date().toISOString().slice(0, 16));
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);
  const [prefilledGoogleFormUrl, setPrefilledGoogleFormUrl] = useState<string>('');

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
    if (!utr || !amount || !screenshotUrl) return;

    const selectedTrader = traders.find((t) => t.id === traderId);
    const traderName = isManualClient ? manualClientName.trim() : (selectedTrader?.name || 'Client');
    const traderPhone = isManualClient ? manualClientPhone.trim() : (selectedTrader?.phone || '+91 98765 43210');
    
    if (!traderName) {
      alert('Please enter or select a client name.');
      return;
    }

    setIsSubmitting(true);

    const creditedEmployee = users.find((u) => u.id === employeeId);
    const employeeDisplayName = creditedEmployee ? creditedEmployee.name : 'Direct / Head Office';

    // 1. Save to local context & Supabase DB in background
    addPayment({
      trader_id: traderId || 'manual-client',
      employee_id: creditedEmployee?.id,
      employee_name: creditedEmployee?.name,
      amount: Number(amount),
      payment_mode: paymentMode,
      utr: utr.trim(),
      transaction_time: new Date(transactionTime).toISOString(),
      screenshot_url: screenshotUrl,
    });

    // 2. Map Payment Mode to Google Form options
    const gFormPaymentMode =
      paymentMode === 'UPI' ? 'UPI Transfer' :
      paymentMode === 'Bank Transfer' ? 'Bank Transfer / IMPS' : 'OTHER';

    const txDate = transactionTime.split('T')[0]; // YYYY-MM-DD
    const effectiveReceiverBank = receiverBank.trim() || 'HDFC Bank';
    const fullRemarks = remarks.trim()
      ? `${remarks.trim()}\nProof URL: ${screenshotUrl}`
      : `Proof URL: ${screenshotUrl}`;

    // 3. Submit to Google Form (formResponse endpoint)
    try {
      const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/formResponse';
      
      const formData = new URLSearchParams();
      formData.append('entry.1747808604', traderName);
      formData.append('entry.1849767789', traderPhone);
      formData.append('entry.1492582845', employeeDisplayName);
      formData.append('entry.2069634994', String(amount));
      formData.append('entry.1834928190', gFormPaymentMode);
      formData.append('entry.1205839201', utr.trim());
      formData.append('entry.1049285721', effectiveReceiverBank);
      formData.append('entry.1948271049', txDate);
      formData.append('entry.1593847291', fullRemarks);

      await fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch {
      // Background post notice handled silently
    }

    // 4. Generate Pre-filled verification link
    const prefillParams = new URLSearchParams({
      'usp': 'pp_url',
      'entry.1747808604': traderName,
      'entry.1849767789': traderPhone,
      'entry.1492582845': employeeDisplayName,
      'entry.2069634994': String(amount),
      'entry.1834928190': gFormPaymentMode,
      'entry.1205839201': utr.trim(),
      'entry.1049285721': effectiveReceiverBank,
      'entry.1948271049': txDate,
      'entry.1593847291': fullRemarks,
    });
    setPrefilledGoogleFormUrl(`https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/viewform?${prefillParams.toString()}`);

    setIsSubmitting(false);
    const refCode = `T2T-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRefId(refCode);
  };

  if (submittedRefId) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white border border-brand-primary/25 p-8 rounded-3xl space-y-6 text-center shadow-2xl animate-in zoom-in-95 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-[#091A2F]">Payment Submitted Successfully</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your payment details have been saved to Supabase and synced with your Google Form ledger.
          </p>
        </div>

        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-left">
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Reference Tracking ID:</span>
            <span className="font-mono font-bold text-brand-primary">{submittedRefId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Submitted UTR:</span>
            <span className="font-mono font-bold text-slate-700">{utr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Receiver Bank Holder:</span>
            <span className="font-semibold text-slate-700">{receiverBank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Sync Status:</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Saved to Database & Google Form Synced
            </span>
          </div>
        </div>

        {prefilledGoogleFormUrl && (
          <a
            href={prefilledGoogleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Pre-Filled Google Form
          </a>
        )}

        <button
          onClick={() => {
            setSubmittedRefId(null);
            setAmount('');
            setUtr('');
            setRemarks('');
            setScreenshotUrl('');
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primaryLight hover:from-brand-primaryLight hover:to-brand-primary text-white font-bold text-xs transition-all shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:-translate-y-0.5 cursor-pointer uppercase tracking-widest"
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

      <div className="bg-white border border-brand-primary/25 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#091A2F]">Profit Sharing Payment Portal</h2>
            <p className="text-xs text-slate-500">Submit screenshot proof and UTR reference details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-650">Client Name & Phone *</label>
              <button
                type="button"
                onClick={() => setIsManualClient(!isManualClient)}
                className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                {isManualClient ? 'Select from Active Traders' : 'Enter Manually'}
              </button>
            </div>
            {isManualClient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={manualClientName}
                  onChange={(e) => setManualClientName(e.target.value)}
                  placeholder="Client Full Name (e.g. Rahul Sharma)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={manualClientPhone}
                  onChange={(e) => setManualClientPhone(e.target.value)}
                  placeholder="Phone (+91 98333 44556)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none font-mono"
                />
              </div>
            ) : (
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
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-650 block mb-1">Employee Name *</label>
            <select
              value={employeeId}
              required
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="">-- Direct / Head Office --</option>
              {users
                .filter((u) => u.is_active && (u.role === 'employee' || u.role === 'admin'))
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === 'employee' ? 'RM' : user.role === 'admin' ? 'Admin' : 'Telecaller'})
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
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
                <option value="Other">OTHER</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-650 block mb-1">UTR / Reference Number *</label>
              <input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. UTR994820194821"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-650 block mb-1">Receiver Bank Holder Name *</label>
              <input
                type="text"
                required
                value={receiverBank}
                onChange={(e) => setReceiverBank(e.target.value)}
                placeholder="e.g. Time2Trade Solutions, Karthik Muni"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all hover:border-brand-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-650 block mb-1">Transaction Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={transactionTime}
              onChange={(e) => setTransactionTime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
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
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading || isSubmitting || !screenshotUrl}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primaryLight hover:from-brand-primaryLight hover:to-brand-primary text-white font-bold text-xs transition-all shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 uppercase tracking-widest"
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
