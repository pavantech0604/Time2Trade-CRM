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
          style: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
      case 'called':
        return {
          label: 'Called',
          icon: PhoneCall,
          style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        };
      case 'not_interested':
        return {
          label: 'Not Interested',
          icon: UserX,
          style: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        };
      case 'follow_up_later':
        return {
          label: 'Follow-Up Later',
          icon: Clock,
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'interested_rm_required':
        return {
          label: 'Interested (RM Req)',
          icon: UserCheck,
          style: 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold animate-pulse',
        };
      case 'rm_contacted':
        return {
          label: 'RM Contacted',
          icon: UserCheck,
          style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        };
      case 'active_trader':
      case 'active':
        return {
          label: 'Active Trader',
          icon: TrendingUp,
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold',
        };
      case 'lost':
        return {
          label: 'Lost Lead',
          icon: XCircle,
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };

      // Payment Statuses
      case 'pending_verification':
        return {
          label: 'Pending Verification',
          icon: AlertTriangle,
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold',
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle2,
          style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };

      default:
        return {
          label: String(status).replace(/_/g, ' '),
          icon: Clock,
          style: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        };
    }
  };

  const { label, icon: Icon, style } = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style} backdrop-blur-sm`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </span>
  );
};
