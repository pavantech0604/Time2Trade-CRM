import React from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../lib/export';

interface ExportButtonsProps<T extends Record<string, any>> {
  data: T[];
  filename: string;
  headers?: { key: keyof T; label: string }[];
  label?: string;
}

export function ExportButtons<T extends Record<string, any>>({
  data,
  filename,
  headers,
  label = 'Export CSV',
}: ExportButtonsProps<T>) {
  return (
    <button
      onClick={() => exportToCSV(data, filename, headers)}
      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-xs"
      title="Download report in CSV format"
    >
      <Download className="w-3.5 h-3.5 text-slate-500" />
      <span>{label}</span>
    </button>
  );
}
