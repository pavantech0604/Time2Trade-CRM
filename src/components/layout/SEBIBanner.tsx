import React, { useState } from 'react';
import { ShieldAlert, X, ExternalLink } from 'lucide-react';

export const SEBIBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-blue-500/10 border-b border-amber-500/30 px-3 sm:px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-2 transition-all">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">SEBI Regulatory Notice</span>
          <span className="sm:hidden">SEBI</span>
        </span>
        <span className="hidden sm:inline">
          Stock-broking operations and client funds management are regulated activities. Preserved registers must be retained for at least <strong>5 years</strong>.
        </span>
        <span className="sm:hidden text-[10px] leading-tight">
          Regulated activities — records retained <strong>5 years</strong>.
        </span>
        <a
          href="https://www.sebi.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-700 font-semibold hover:underline shrink-0"
        >
          <span>sebi.gov.in</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-700 hover:bg-amber-500/20 rounded transition-colors shrink-0 cursor-pointer"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
