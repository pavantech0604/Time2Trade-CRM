import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PaymentMode,
  ServiceCategory,
  ServiceType,
  SubscriptionDuration,
  PaymentAllocation,
  User,
} from '../../types';
import {
  CreditCard,
  Upload,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  ExternalLink,
  TrendingUp,
  Coins,
  Calendar,
  Layers,
  UserCheck,
  Trash2,
  AlertCircle,
  HelpCircle,
  Check,
  Building2,
  FileCheck,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { uploadFileToBucket, supabase } from '../../lib/supabase';
import { formatINR } from '../../lib/formatters';
import { EmployeeAutocomplete } from './EmployeeAutocomplete';
import { AllocationCalculator } from './AllocationCalculator';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
  );
};

interface PublicPaymentFormProps {
  onBack?: () => void;
}

export const PublicPaymentForm: React.FC<PublicPaymentFormProps> = ({ onBack }) => {
  const { currentUser, traders, addPayment, users } = useAuth();

  // 1. Client Details State
  const [traderId, setTraderId] = useState(traders[0]?.id || '');
  const [isManualClient, setIsManualClient] = useState(traders.length === 0);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');

  // 2. Service Details State (Initially unselected/blank)
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | ''>('');
  const [serviceType, setServiceType] = useState<ServiceType | ''>('');
  const [subscriptionDuration, setSubscriptionDuration] = useState<SubscriptionDuration | ''>('');

  // 3. Payment Details State
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [utr, setUtr] = useState('');
  const [receiverBank, setReceiverBank] = useState('');
  const [transactionTime, setTransactionTime] = useState(
    new Date().toISOString().slice(0, 16)
  );

  // 4. Shared Payment & Allocation State
  // Primary employee is submitting user
  const effectivePrimaryUser: User = currentUser
    ? currentUser
    : {
        id: users.find((u) => u.role === 'admin' || u.role === 'employee')?.id || 'primary-staff',
        name: 'Primary Staff',
        email: 'staff@time2trade.com',
        role: 'employee',
        employee_code: 'EMP-101',
        designation: 'Sales Executive',
        created_at: new Date().toISOString(),
      };

  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const amountInputRefs = useRef<{ [empId: string]: HTMLInputElement | null }>({});

  // 5. Proof & Remarks State
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [proofFileMeta, setProofFileMeta] = useState<{
    name: string;
    size: string;
    type: string;
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 6. Review & Confirmation State
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);
  const [prefilledGoogleFormUrl, setPrefilledGoogleFormUrl] = useState<string>('');

  // Confirmation modal state for removing allocated employee
  const [removeConfirmEmp, setRemoveConfirmEmp] = useState<PaymentAllocation | null>(null);

  // Category change side-effect: ensure serviceType belongs to category, or clear if mismatched
  useEffect(() => {
    if (serviceCategory === 'Equity') {
      const equityOptions: ServiceType[] = ['Cash', 'Future Option', 'Stock Option'];
      if (serviceType && !equityOptions.includes(serviceType as ServiceType)) {
        setServiceType('');
      }
    } else if (serviceCategory === 'Commodity') {
      const commodityOptions: ServiceType[] = ['Gold', 'Silver', 'Crude Oil'];
      if (serviceType && !commodityOptions.includes(serviceType as ServiceType)) {
        setServiceType('');
      }
    } else {
      setServiceType('');
    }
  }, [serviceCategory]);

  // Maintain Primary Employee in allocations whenever amount or currentUser changes
  useEffect(() => {
    const numAmount = typeof amount === 'number' ? amount : 0;
    setAllocations((prev) => {
      const primaryIndex = prev.findIndex((a) => a.is_primary);
      if (primaryIndex === -1) {
        // Initialize with primary employee taking full amount
        return [
          {
            id: generateUUID(),
            employee_id: effectivePrimaryUser.id,
            employee_name: effectivePrimaryUser.name,
            employee_code: effectivePrimaryUser.employee_code || `EMP-${effectivePrimaryUser.id.slice(0, 4).toUpperCase()}`,
            employee_role: effectivePrimaryUser.designation || (effectivePrimaryUser.role === 'admin' ? 'Admin' : 'Sales Executive'),
            employee_email: effectivePrimaryUser.email,
            allocation_amount: numAmount,
            allocation_percentage: 100,
            is_primary: true,
          },
        ];
      }

      // If only primary employee exists, keep full amount synced
      if (prev.length === 1 && prev[0].is_primary) {
        return [
          {
            ...prev[0],
            employee_id: effectivePrimaryUser.id,
            employee_name: effectivePrimaryUser.name,
            allocation_amount: numAmount,
            allocation_percentage: 100,
          },
        ];
      }

      return prev;
    });
  }, [amount, effectivePrimaryUser.id]);

  // Derived Allocation Totals
  const totalPaymentAmount = typeof amount === 'number' ? amount : 0;
  const totalAllocatedAmount = allocations.reduce((sum, a) => sum + (Number(a.allocation_amount) || 0), 0);
  const remainingAmount = totalPaymentAmount - totalAllocatedAmount;
  const isAllocationValid = totalPaymentAmount > 0 && remainingAmount === 0 && allocations.every((a) => a.allocation_amount > 0);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      alert('Please upload a valid JPG, JPEG, or PNG payment screenshot.');
      return;
    }

    const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setProofFileMeta({
      name: file.name,
      size: fileSizeFormatted,
      type: file.type,
    });

    setIsUploading(true);
    const res = await uploadFileToBucket('payment-proofs', file, 'proof');
    setIsUploading(false);

    if (res.error) {
      alert(`Error uploading file: ${res.error.message || 'Please check storage bucket permissions.'}`);
      return;
    }

    if (res.path) {
      if (supabase) {
        const cleanPath = res.path.replace('payment-proofs/', '');
        const { data } = supabase.storage.from('payment-proofs').getPublicUrl(cleanPath);
        if (data?.publicUrl) {
          setScreenshotUrl(data.publicUrl);
        } else {
          setScreenshotUrl(URL.createObjectURL(file));
        }
      } else {
        setScreenshotUrl(URL.createObjectURL(file));
      }
    }
  };

  // Add Shared Employee from Autocomplete
  const handleSelectEmployee = (user: User) => {
    // Prevent adding primary or duplicates
    if (user.id === effectivePrimaryUser.id) return;
    if (allocations.some((a) => a.employee_id === user.id)) return;
    if (allocations.length >= 4) return; // Primary + max 3 additional

    const newAlloc: PaymentAllocation = {
      id: generateUUID(),
      employee_id: user.id,
      employee_name: user.name,
      employee_code: user.employee_code || `EMP-${user.id.slice(0, 4).toUpperCase()}`,
      employee_role: user.designation || (user.role === 'admin' ? 'Admin' : 'Sales Executive'),
      employee_email: user.email,
      allocation_amount: 0,
      allocation_percentage: 0,
      is_primary: false,
    };

    setAllocations((prev) => [...prev, newAlloc]);

    // Automatically focus the new employee's amount input
    setTimeout(() => {
      if (amountInputRefs.current[user.id]) {
        amountInputRefs.current[user.id]?.focus();
        amountInputRefs.current[user.id]?.select();
      }
    }, 150);
  };

  // Remove Shared Employee with confirmation if amount > 0
  const handleRemoveEmployee = (alloc: PaymentAllocation) => {
    if (alloc.is_primary) return;

    if (alloc.allocation_amount > 0) {
      setRemoveConfirmEmp(alloc);
    } else {
      setAllocations((prev) => prev.filter((a) => a.employee_id !== alloc.employee_id));
    }
  };

  const confirmRemoveEmployee = () => {
    if (!removeConfirmEmp) return;
    setAllocations((prev) => prev.filter((a) => a.employee_id !== removeConfirmEmp.employee_id));
    setRemoveConfirmEmp(null);
  };

  // Update Individual Allocation Amount
  const handleAllocationAmountChange = (employeeId: string, value: string) => {
    // Only positive digits
    const cleaned = value.replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : Number(cleaned);

    setAllocations((prev) =>
      prev.map((a) => {
        if (a.employee_id === employeeId) {
          const pct = totalPaymentAmount > 0 ? Number(((num / totalPaymentAmount) * 100).toFixed(1)) : 0;
          return { ...a, allocation_amount: num, allocation_percentage: pct };
        }
        return a;
      })
    );
  };

  // Quick Action: Split Equally
  const handleSplitEqually = () => {
    if (totalPaymentAmount <= 0 || allocations.length === 0) return;
    const count = allocations.length;
    const equalShare = Math.floor(totalPaymentAmount / count);
    const remainder = totalPaymentAmount - equalShare * count;

    setAllocations((prev) =>
      prev.map((a, index) => {
        // Give any rounding remainder to primary employee
        const allocAmt = index === 0 ? equalShare + remainder : equalShare;
        const pct = Number(((allocAmt / totalPaymentAmount) * 100).toFixed(1));
        return { ...a, allocation_amount: allocAmt, allocation_percentage: pct };
      })
    );
  };

  // Quick Action: Assign Remaining to Primary
  const handleAssignRemainingToPrimary = () => {
    if (remainingAmount <= 0) return;
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.is_primary) {
          const newAmt = a.allocation_amount + remainingAmount;
          const pct = Number(((newAmt / totalPaymentAmount) * 100).toFixed(1));
          return { ...a, allocation_amount: newAmt, allocation_percentage: pct };
        }
        return a;
      })
    );
  };

  // Quick Action: Clear Allocations
  const handleClearAllocations = () => {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.is_primary) {
          return {
            ...a,
            allocation_amount: totalPaymentAmount,
            allocation_percentage: 100,
          };
        }
        return { ...a, allocation_amount: 0, allocation_percentage: 0 };
      })
    );
  };

  // Form Validation Checklist
  const clientName = isManualClient
    ? manualClientName.trim()
    : traders.find((t) => t.id === traderId)?.name || '';
  const clientPhone = isManualClient
    ? manualClientPhone.trim()
    : traders.find((t) => t.id === traderId)?.phone || '';

  const isClientValid = Boolean(clientName && clientPhone);
  const isPaymentValid = Boolean(totalPaymentAmount > 0 && utr.trim() && screenshotUrl);
  const isFormValid =
    isClientValid &&
    Boolean(serviceCategory && serviceType && subscriptionDuration) &&
    isPaymentValid &&
    isAllocationValid &&
    isConfirmed;

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    const primaryEmployeeName = effectivePrimaryUser.name;
    const additionalAllocations = allocations.filter((a) => !a.is_primary && a.allocation_amount > 0);

    const allocationSummaryRemark = allocations
      .map(
        (a) =>
          `${a.employee_name}${a.is_primary ? ' (Primary)' : ''}: ₹${Number(
            a.allocation_amount
          ).toLocaleString('en-IN')}${
            a.allocation_percentage ? ` (${a.allocation_percentage}%)` : ''
          }`
      )
      .join('; ');

    const completeRemarks = remarks.trim()
      ? `${remarks.trim()}\nAllocations: ${allocationSummaryRemark}\nService: ${serviceCategory} - ${serviceType} (${subscriptionDuration})\nProof URL: ${screenshotUrl}`
      : `Allocations: ${allocationSummaryRemark}\nService: ${serviceCategory} - ${serviceType} (${subscriptionDuration})\nProof URL: ${screenshotUrl}`;

    const allocationWithProof = screenshotUrl
      ? `${allocationSummaryRemark}\nProof: ${screenshotUrl}`
      : allocationSummaryRemark;

    // 1. Save to AuthContext & Supabase DB
    addPayment({
      trader_id: traderId || 'manual-client',
      trader_name: clientName,
      trader_phone: clientPhone,
      employee_id: effectivePrimaryUser.id,
      employee_name: primaryEmployeeName,
      amount: totalPaymentAmount,
      payment_mode: paymentMode,
      utr: utr.trim(),
      transaction_time: new Date(transactionTime).toISOString(),
      screenshot_url: screenshotUrl,
      service_category: serviceCategory,
      service_type: serviceType,
      subscription_duration: subscriptionDuration,
      receiver_bank_name: receiverBank.trim(),
      remarks: completeRemarks,
      allocations: allocations,
      is_shared: allocations.length > 1,
    } as any);

    // 2. Map Payment Mode & Duration to Google Form exact options
    const gFormPaymentMode =
      paymentMode === 'UPI' ? 'UPI Transfer' :
      paymentMode === 'Bank Transfer' ? 'Bank Transfer / IMPS' : 'OTHER';

    const gFormDuration =
      subscriptionDuration === '3 Months' ? '3 months' :
      subscriptionDuration === '6 Months' ? '6 months' : 'yearly';

    const txDate = transactionTime.split('T')[0];
    const effectiveReceiverBank = receiverBank.trim() || 'N/A';

    // 3. Background Sync to Google Form Ledger
    try {
      const googleFormUrl =
        'https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/formResponse';

      const formData = new URLSearchParams();
      formData.append('entry.296808543', clientName);
      formData.append('entry.1646904639', clientPhone);
      formData.append('entry.306110806', serviceCategory);
      formData.append('entry.1355689734', serviceType);
      formData.append('entry.492004714', gFormDuration);
      formData.append('entry.1702720898', primaryEmployeeName);
      formData.append('entry.1193149425', String(totalPaymentAmount));
      formData.append('entry.507882490', gFormPaymentMode);
      formData.append('entry.1903456714', utr.trim());
      formData.append('entry.1374647109', effectiveReceiverBank);
      formData.append('entry.1663408271', txDate);
      formData.append('entry.1552774651', allocationWithProof);

      await fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch {
      // Handled silently
    }

    // 4. Generate Pre-filled Google Form URL
    const prefillParams = new URLSearchParams({
      usp: 'pp_url',
      'entry.296808543': clientName,
      'entry.1646904639': clientPhone,
      'entry.306110806': serviceCategory,
      'entry.1355689734': serviceType,
      'entry.492004714': gFormDuration,
      'entry.1702720898': primaryEmployeeName,
      'entry.1193149425': String(totalPaymentAmount),
      'entry.507882490': gFormPaymentMode,
      'entry.1903456714': utr.trim(),
      'entry.1374647109': effectiveReceiverBank,
      'entry.1663408271': txDate,
      'entry.1552774651': allocationWithProof,
    });
    setPrefilledGoogleFormUrl(
      `https://docs.google.com/forms/d/e/1FAIpQLSdEPUeP_q3MepAw5j-tgJa23HsD-lixzMoihND9Z1AhdhXxJQ/viewform?${prefillParams.toString()}`
    );

    setIsSubmitting(false);
    const refCode = `T2T-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRefId(refCode);
  };

  // Helper for initials
  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // SUCCESS SCREEN
  if (submittedRefId) {
    return (
      <div className="max-w-2xl mx-auto my-8 bg-white border border-brand-primary/20 p-8 md:p-10 rounded-3xl space-y-6 text-center shadow-2xl animate-in zoom-in-95 font-sans">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
            Submission Acknowledged
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#091A2F] mt-2">
            Payment Submitted Successfully
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-lg mx-auto">
            Payment details and employee allocations have been routed to the Anti-Fraud Verification Center for administrator review.
          </p>
        </div>

        <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200 space-y-3 text-xs text-left">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Reference Tracking ID:</span>
            <span className="font-mono font-bold text-brand-primary text-sm">{submittedRefId}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Client Name:</span>
            <span className="font-bold text-slate-800">{clientName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Service Details:</span>
            <span className="font-bold text-slate-800">{serviceCategory} • {serviceType} ({subscriptionDuration})</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Total Amount:</span>
            <span className="font-mono font-black text-emerald-700 text-sm">{formatINR(totalPaymentAmount)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Submitted UTR:</span>
            <span className="font-mono font-bold text-slate-700">{utr}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold">Receiver Bank Holder Name:</span>
            <span className="font-semibold text-slate-700">{receiverBank}</span>
          </div>

          <div className="pt-2">
            <span className="text-slate-500 font-bold block mb-1.5 uppercase text-[10px] tracking-wider">
              Allocated Credits ({allocations.length} Staff):
            </span>
            <div className="space-y-1.5">
              {allocations.map((a) => (
                <div key={a.employee_id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-[10px] font-bold flex items-center justify-center">
                      {getInitials(a.employee_name)}
                    </div>
                    <span className="font-bold text-slate-800">{a.employee_name}</span>
                    {a.is_primary && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(a.allocation_amount)} ({a.allocation_percentage}%)
                  </span>
                </div>
              ))}
            </div>
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
          type="button"
          onClick={() => {
            setSubmittedRefId(null);
            setTraderId(traders[0]?.id || '');
            setManualClientName('');
            setManualClientPhone('');
            setServiceCategory('');
            setServiceType('');
            setSubscriptionDuration('');
            setAmount('');
            setUtr('');
            setRemarks('');
            setScreenshotUrl('');
            setProofFileMeta(null);
            setIsConfirmed(false);
            setAllocations([]);
          }}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-blue-200" />
          <span>Submit Another Payment Proof</span>
        </button>
      </div>
    );
  }

  // MAIN FORM INTERFACE
  return (
    <div className="max-w-7xl mx-auto my-6 px-4 space-y-6 font-sans animate-in fade-in duration-300">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#091A2F] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-brand-primary/20 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-inner">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-[#091A2F]">
                Payment Submission Portal
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Shared Workflow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Submit verified bank payment proofs and allocate sales credits among advisory staff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitting Staff</span>
            <span className="font-bold text-slate-800">{effectivePrimaryUser.name}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-brand-primaryLight text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {getInitials(effectivePrimaryUser.name)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: FORM SECTIONS 1 TO 5 */}
          <div className="lg:col-span-8 space-y-6">
            {/* SECTION 1: CLIENT DETAILS */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                    1
                  </span>
                  <h3 className="text-base font-black text-slate-800">Client Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualClient(!isManualClient)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer transition-colors"
                >
                  {isManualClient ? '← Select Active Trader' : '+ Enter Prospect Manually'}
                </button>
              </div>

              {isManualClient ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualClientName}
                      onChange={(e) => setManualClientName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualClientPhone}
                      onChange={(e) => setManualClientPhone(e.target.value)}
                      placeholder="+91 98333 44556"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Active Client Trader <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={traderId}
                    required
                    onChange={(e) => setTraderId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  >
                    <option value="" disabled>-- Select Active Trader --</option>
                    {traders.map((trader) => (
                      <option key={trader.id} value={trader.id}>
                        {trader.name} ({trader.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SECTION 2: SERVICE DETAILS */}
            <div className="bg-white border border-slate-200/90 p-6 md:p-7 rounded-3xl shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
                    2
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Service Details</h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate">Select advisory category, sub-segment, and duration</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {(serviceCategory || serviceType || subscriptionDuration) && (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceCategory('');
                        setServiceType('');
                        setSubscriptionDuration('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap shrink-0"
                      title="Unselect and leave all service options blank"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Unselect All</span>
                    </button>
                  )}
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 font-semibold whitespace-nowrap shrink-0">
                    <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="whitespace-nowrap">Click to toggle</span>
                  </div>
                </div>
              </div>

              {/* Service Category */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Service Category <span className="text-rose-500">*</span>
                  </label>
                  {!serviceCategory ? (
                    <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 whitespace-nowrap shrink-0">
                      Unselected (Click to choose)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceCategory('');
                        setServiceType('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Click to unselect category"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" /> {serviceCategory} <span className="text-[9px] text-emerald-600 font-normal ml-0.5">(Click to clear)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Equity Card Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceCategory === 'Equity') {
                        setServiceCategory('');
                        setServiceType('');
                      } else {
                        setServiceCategory('Equity');
                      }
                    }}
                    className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      serviceCategory === 'Equity'
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10'
                        : 'border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/70 bg-white shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                          serviceCategory === 'Equity'
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-white'
                            : 'bg-blue-50 text-blue-600 group-hover:scale-105 group-hover:bg-blue-100'
                        }`}
                      >
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold ${serviceCategory === 'Equity' ? 'text-blue-950' : 'text-slate-800'}`}>
                          Equity
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Cash, Future & Stock Options
                        </span>
                      </div>
                    </div>
                    {/* Check / Radio Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ml-2 ${
                        serviceCategory === 'Equity'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {serviceCategory === 'Equity' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Commodity Card Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceCategory === 'Commodity') {
                        setServiceCategory('');
                        setServiceType('');
                      } else {
                        setServiceCategory('Commodity');
                      }
                    }}
                    className={`group relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      serviceCategory === 'Commodity'
                        ? 'border-amber-500 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10'
                        : 'border-slate-200/90 hover:border-amber-300 hover:bg-slate-50/70 bg-white shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                          serviceCategory === 'Commodity'
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-white'
                            : 'bg-amber-50 text-amber-600 group-hover:scale-105 group-hover:bg-amber-100'
                        }`}
                      >
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold ${serviceCategory === 'Commodity' ? 'text-amber-950' : 'text-slate-800'}`}>
                          Commodity
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Gold, Silver & Crude Oil
                        </span>
                      </div>
                    </div>
                    {/* Check / Radio Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ml-2 ${
                        serviceCategory === 'Commodity'
                          ? 'border-amber-500 bg-amber-500 text-white shadow-2xs'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {serviceCategory === 'Commodity' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Dependent Service Types */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Service Type {serviceCategory ? `(${serviceCategory})` : ''} <span className="text-rose-500">*</span>
                  </label>
                  {!serviceType ? (
                    <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 whitespace-nowrap shrink-0">
                      Unselected (Click an option below)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setServiceType('')}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Click to unselect service type"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" /> {serviceType} <span className="text-[9px] text-emerald-600 font-normal ml-0.5">(Click to clear)</span>
                    </button>
                  )}
                </div>

                {serviceCategory === 'Equity' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                    {(['Cash', 'Future Option', 'Stock Option'] as ServiceType[]).map((type) => {
                      const isSelected = serviceType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setServiceType((prev) => (prev === type ? '' : type))}
                          className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-700 shadow-2xs'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{type}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : serviceCategory === 'Commodity' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                    {(['Gold', 'Silver', 'Crude Oil'] as ServiceType[]).map((type) => {
                      const isSelected = serviceType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setServiceType((prev) => (prev === type ? '' : type))}
                          className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'border-amber-600 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-700 shadow-2xs'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{type}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                          Equity Segments
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['Cash', 'Future Option', 'Stock Option'] as ServiceType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setServiceCategory('Equity');
                              setServiceType(type);
                            }}
                            className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center shadow-2xs hover:shadow-xs"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                          Commodity Segments
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['Gold', 'Silver', 'Crude Oil'] as ServiceType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setServiceCategory('Commodity');
                              setServiceType(type);
                            }}
                            className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 text-xs font-semibold transition-all cursor-pointer text-center shadow-2xs hover:shadow-xs"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Duration */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    Subscription Duration <span className="text-rose-500">*</span>
                  </label>
                  {!subscriptionDuration ? (
                    <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 whitespace-nowrap shrink-0">
                      Unselected (Click to choose)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubscriptionDuration('')}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Click to unselect duration"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" /> {subscriptionDuration} <span className="text-[9px] text-emerald-600 font-normal ml-0.5">(Click to clear)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['3 Months', '6 Months', 'Yearly'] as SubscriptionDuration[]).map((duration) => {
                    const isSelected = subscriptionDuration === duration;
                    return (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setSubscriptionDuration((prev) => (prev === duration ? '' : duration))}
                        className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-700 shadow-2xs'
                        }`}
                      >
                        <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`} />
                        <span>{duration}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT DETAILS */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                  3
                </span>
                <h3 className="text-base font-black text-slate-800">Payment Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Payment Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 30000"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {totalPaymentAmount > 0 && `Formatted: ${formatINR(totalPaymentAmount)}`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="Bank Transfer">Bank Transfer / IMPS</option>
                    <option value="Other">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UTR / Reference Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receiver Bank Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receiverBank}
                    onChange={(e) => setReceiverBank(e.target.value)}
                    placeholder="e.g. Time2Trade Solutions / Account Holder Name"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transaction Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={transactionTime}
                  onChange={(e) => setTransactionTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>

            {/* SECTION 4: SHARED PAYMENT & ALLOCATION */}
            <div className="bg-white border border-slate-200 p-3.5 sm:p-6 rounded-3xl shadow-sm space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                    4
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">Sales Sharing & Allocation</h3>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  {allocations.length} Staff ({allocations.filter((a) => !a.is_primary).length}/3 Shared)
                </span>
              </div>

              {/* Allocation Rows Table / Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    Staff Allocation Breakdown
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium sm:hidden">
                    Tap ₹ to edit share
                  </span>
                </div>

                <div className="space-y-2">
                  {allocations.map((alloc) => {
                    const isPrimary = alloc.is_primary;
                    const empCode = alloc.employee_code || `EMP-${alloc.employee_id.slice(0, 4).toUpperCase()}`;

                    return (
                      <div
                        key={alloc.employee_id}
                        className={`p-2 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 ${
                          isPrimary
                            ? 'bg-blue-50/50 border-blue-200/90 ring-1 ring-blue-300/30'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Employee Identity */}
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-[11px] sm:text-xs shrink-0 shadow-2xs ${
                            isPrimary
                              ? 'bg-brand-primary text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {getInitials(alloc.employee_name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[105px] sm:max-w-[180px]">
                                {alloc.employee_name}
                              </span>
                              {isPrimary ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 border border-blue-200/80 shrink-0">
                                  Primary
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 shrink-0">
                                  Shared
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium">
                              <span className="font-mono text-[9px] sm:text-[10px]">{empCode}</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-brand-primary bg-brand-primary/10 px-1 py-0.2 rounded text-[10px]">
                                {alloc.allocation_percentage || 0}% share
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount Input & Percentage */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="relative w-28 sm:w-36">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                              ₹
                            </span>
                            <input
                              ref={(el) => {
                                amountInputRefs.current[alloc.employee_id] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={alloc.allocation_amount === 0 ? '' : alloc.allocation_amount}
                              onChange={(e) => handleAllocationAmountChange(alloc.employee_id, e.target.value)}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs sm:text-sm text-right text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all bg-white"
                            />
                          </div>

                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployee(alloc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                              title="Remove employee"
                              aria-label={`Remove ${alloc.employee_name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Autocomplete Search & Quick Add Chips Placed Directly Beneath Staff Cards */}
                <div className="pt-1">
                  <EmployeeAutocomplete
                    allUsers={users}
                    primaryEmployeeId={effectivePrimaryUser.id}
                    selectedEmployeeIds={allocations.filter((a) => !a.is_primary).map((a) => a.employee_id)}
                    onSelectEmployee={handleSelectEmployee}
                    maxSharedEmployees={3}
                    disabled={totalPaymentAmount <= 0}
                  />
                </div>
              </div>

              {/* Real-time Allocation Calculator Component */}
              <AllocationCalculator
                totalAmount={totalPaymentAmount}
                allocatedAmount={totalAllocatedAmount}
                creditedCount={allocations.length}
                onSplitEqually={handleSplitEqually}
                onAssignRemainingToPrimary={handleAssignRemainingToPrimary}
                onClearAllocations={handleClearAllocations}
                disabled={totalPaymentAmount <= 0}
              />
            </div>

            {/* SECTION 5: PAYMENT PROOF */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                    5
                  </span>
                  <h3 className="text-base font-black text-slate-800">Payment Proof</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Single Proof Upload</span>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                Upload a clear screenshot showing the UTR/reference number, amount, date, and beneficiary details.
              </p>

              {/* Screenshot Upload Dropzone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-2 cursor-pointer relative transition-all min-h-[120px] flex flex-col items-center justify-center ${
                  screenshotUrl
                    ? 'border-emerald-500/50 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-brand-primary/50 bg-[#FAF8F5]'
                }`}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload
                  className={`w-8 h-8 mx-auto ${screenshotUrl ? 'text-emerald-600' : 'text-slate-400'}`}
                />
                <p className="text-xs text-slate-700 font-semibold">
                  {isUploading
                    ? 'Uploading proof image...'
                    : screenshotUrl
                    ? 'Payment proof uploaded successfully! Click to replace'
                    : 'Click or drop payment proof screenshot here (JPG/PNG)'}
                </p>
                <span className="text-[10px] text-slate-400 block font-medium">
                  Max file size: 10 MB. Verified automatically by Anti-Fraud team.
                </span>
              </div>

              {/* Uploaded File Details */}
              {screenshotUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={screenshotUrl}
                      alt="Proof Preview"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block truncate max-w-xs">
                        {proofFileMeta?.name || 'Payment Proof Screenshot'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {proofFileMeta?.size || 'Image File'} • Verified Image Format
                      </span>
                    </div>
                  </div>

                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Full
                  </a>
                </div>
              )}

              {/* Optional Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification Remarks (Optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any specific context, trader conversation notes, or transaction details..."
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY REVIEW & SUBMISSION CARD */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                    6
                  </span>
                  <h3 className="text-base font-black text-slate-800">Review & Submit</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Step 6 of 6
                </span>
              </div>

              {/* Summary Items */}
              <div className="space-y-3 text-xs divide-y divide-slate-100">
                {/* Client Review */}
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-semibold">Client:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {clientName || <em className="text-slate-400 font-normal">Pending</em>}
                    {clientPhone && <span className="block text-[10px] font-mono text-slate-400">{clientPhone}</span>}
                  </span>
                </div>

                {/* Service Review */}
                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-slate-500 font-semibold">Service:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {serviceCategory && serviceType ? (
                      <>
                        {serviceCategory} • {serviceType}
                        {subscriptionDuration && (
                          <span className="block text-[10px] text-teal-600 font-semibold">{subscriptionDuration}</span>
                        )}
                      </>
                    ) : (
                      <em className="text-slate-400 font-normal">Pending Selection</em>
                    )}
                  </span>
                </div>

                {/* Payment Review */}
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-semibold">Total Payment:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatINR(totalPaymentAmount)}
                  </span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-semibold">Payment Mode:</span>
                  <span className="font-bold text-slate-700">{paymentMode}</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-semibold">UTR Reference:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {utr || <em className="text-slate-400 font-normal">Pending</em>}
                  </span>
                </div>

                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-semibold">Receiver Bank Holder Name:</span>
                  <span className="font-bold text-slate-700">
                    {receiverBank || <em className="text-slate-400 font-normal">Not specified</em>}
                  </span>
                </div>

                {/* Sales Allocation Breakdown Review */}
                <div className="pt-2 space-y-1.5">
                  <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
                    Sales Allocation:
                  </span>
                  {allocations.map((a) => (
                    <div key={a.employee_id} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-xl text-[11px]">
                      <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                        {a.employee_name} {a.is_primary && '(Primary)'}
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatINR(a.allocation_amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-1 pt-1 text-[11px]">
                    <span className="text-slate-500 font-semibold">Allocation Status:</span>
                    {isAllocationValid ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Complete
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">
                        {remainingAmount > 0 ? `${formatINR(remainingAmount)} Remaining` : `Exceeds by ${formatINR(Math.abs(remainingAmount))}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Proof Status Review */}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Payment Proof:</span>
                  {screenshotUrl ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Uploaded
                    </span>
                  ) : (
                    <span className="text-rose-500 font-bold">Missing</span>
                  )}
                </div>
              </div>

              {/* Confirmation Tile */}
              <div className="pt-2 border-t border-slate-100">
                <label
                  onClick={() => setIsConfirmed(!isConfirmed)}
                  className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    isConfirmed
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isConfirmed
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-semibold leading-snug">
                    I confirm that the payment details and employee allocation amounts are correct.
                  </span>
                </label>
              </div>

              {/* Submit Button with High-Conversion Fintech CTA */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting || isUploading}
                className={`group relative w-full overflow-hidden py-3.5 px-5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer ${
                  !isFormValid
                    ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : isSubmitting
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white cursor-wait opacity-90 shadow-md'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] border-t border-white/20'
                }`}
              >
                {/* Subtle Glass Top Highlight */}
                {isFormValid && !isSubmitting && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                )}

                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-200 shrink-0" />
                    <span>Submitting Payment Proof…</span>
                  </>
                ) : !isFormValid ? (
                  <>
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-xs uppercase tracking-wider">Complete Required Fields</span>
                  </>
                ) : (
                  <>
                    {/* Illuminated Icon Badge */}
                    <div className="w-7 h-7 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 border border-white/20 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    </div>

                    <span className="tracking-tight text-sm font-black">
                      Submit Payment for Verification
                    </span>

                    {/* Right Trailing Arrow with Slide */}
                    <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 group-hover:text-white transition-transform shrink-0" />
                  </>
                )}
              </button>

              {!isFormValid && (
                <div className="space-y-1 text-[11px] text-slate-400 font-medium">
                  {!isClientValid && <p>• Client name and phone are required.</p>}
                  {(!serviceCategory || !serviceType || !subscriptionDuration) && (
                    <p>• Select service category, type, and subscription duration.</p>
                  )}
                  {totalPaymentAmount <= 0 && <p>• Payment amount must be greater than ₹0.</p>}
                  {!utr.trim() && <p>• UTR / Reference number is required.</p>}
                  {!screenshotUrl && <p>• Upload a payment proof screenshot.</p>}
                  {!isAllocationValid && <p>• Total allocated amount must equal the payment amount.</p>}
                  {!isConfirmed && <p>• Check the confirmation box.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal for Removing an Employee */}
      {removeConfirmEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div>
              <h4 className="text-base font-black text-slate-800">Remove Shared Employee?</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                {removeConfirmEmp.employee_name} already has an allocated credit of{' '}
                <strong>{formatINR(removeConfirmEmp.allocation_amount)}</strong>. Removing them will clear their amount.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmEmp(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveEmployee}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-all active:scale-95"
              >
                Yes, Remove Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
