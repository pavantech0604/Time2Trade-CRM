import React from 'react';
import {
  Sparkles,
  PhoneCall,
  UserX,
  Clock,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  XCircle,
  AlertTriangle,
  PhoneForwarded,
} from 'lucide-react';
import { LeadStatus, PaymentStatus, TraderStatus } from '../../types';

interface StatusBadgeProps {
  status: LeadStatus | PaymentStatus | TraderStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      // Lead Statuses
      case 'new':
        return {
          label: 'New Lead',
          icon: Sparkles,
          style: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'called':
        return {
          label: 'Called',
          icon: PhoneCall,
          style: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      case 'callback_requested':
        return {
          label: 'Callback Requested',
          icon: PhoneForwarded,
          style: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'interested':
        return {
          label: 'Interested',
          icon: UserCheck,
          style: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
        };
      case 'not_interested':
        return {
          label: 'Not Interested',
          icon: UserX,
          style: 'bg-slate-100 text-slate-600 border-slate-200',
        };
      case 'follow_up_later':
        return {
          label: 'Follow-Up Later',
          icon: Clock,
          style: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'active_trader':
      case 'active':
        return {
          label: 'Active Trader',
          icon: TrendingUp,
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
        };
      case 'lost':
        return {
          label: 'Lost Lead',
          icon: XCircle,
          style: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'inactive':
        return {
          label: 'Inactive',
          icon: Clock,
          style: 'bg-slate-100 text-slate-500 border-slate-200',
        };

      // Payment Statuses
      case 'pending_verification':
        return {
          label: 'Pending Verification',
          icon: AlertTriangle,
          style: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          style: 'bg-rose-50 text-rose-700 border-rose-200',
        };

      default:
        return {
          label: String(status).replace(/_/g, ' '),
          icon: Clock,
          style: 'bg-slate-100 text-slate-500 border-slate-200',
        };
    }
  };

  const { label, icon: Icon, style } = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border whitespace-nowrap ${style}`}
    >
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
};
