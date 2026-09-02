import React, { useState } from 'react';
import { ShieldAlert, X, FileText, ExternalLink } from 'lucide-react';

export const SEBIBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-blue-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between transition-all">
      <div className="flex items-center space-x-2 flex-wrap">
        <span className="flex items-center space-x-1 font-bold text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>SEBI Regulatory Notice</span>
        </span>
        <span>
          Stock-broking operations and client funds management are regulated activities. Preserved registers (Ledgers, Journals, Cash Books, Bank Records) must be retained for at least <strong>5 years</strong>.
        </span>
        <a
          href="https://www.sebi.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-0.5 text-blue-700 dark:text-blue-400 font-semibold hover:underline"
        >
          <span>sebi.gov.in</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded transition-colors"
        title="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
