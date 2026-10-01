import React, { useState, useMemo } from 'react';
import { Payment } from '../../types';
import { formatINR, formatDate } from '../../lib/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { exportToCSV } from '../../lib/export';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CreditCard,
  Phone,
  Layers,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface MonthlyTransactionsTableProps {
  transactions: Payment[];
  monthLabel: string;
  onPreviewProof?: (url: string) => void;
  isLoading?: boolean;
}

export const MonthlyTransactionsTable: React.FC<MonthlyTransactionsTableProps> = ({
  transactions,
  monthLabel,
  onPreviewProof,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending_verification' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Equity' | 'Commodity'>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status counts for badge pills
  const statusCounts = useMemo(() => {
    return {
      all: transactions.length,
      approved: transactions.filter((p) => p.status === 'approved').length,
      pending: transactions.filter((p) => p.status === 'pending_verification').length,
      rejected: transactions.filter((p) => p.status === 'rejected').length,
    };
  }, [transactions]);

  // 1. FILTERING (PRE-PAGINATION)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && p.service_category !== categoryFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const client = (p.client_name || p.trader_name || '').toLowerCase();
        const phone = (p.client_phone || p.trader_phone || '').toLowerCase();
        const utr = (p.utr || '').toLowerCase();
        const emp = (p.employee_name || '').toLowerCase();
        const category = (p.service_category || '').toLowerCase();

        const match =
          client.includes(q) ||
          phone.includes(q) ||
          utr.includes(q) ||
          emp.includes(q) ||
          category.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [transactions, statusFilter, categoryFilter, searchQuery]);

  // 2. SORTING (PRE-PAGINATION)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const timeA = new Date(a.transaction_time || a.created_at).getTime();
      const timeB = new Date(b.transaction_time || b.created_at).getTime();
      const amtA = Number(a.amount || 0);
      const amtB = Number(b.amount || 0);

      switch (sortOption) {
        case 'newest':
          return timeB - timeA;
        case 'oldest':
          return timeA - timeB;
        case 'amount_high':
          return amtB - amtA;
        case 'amount_low':
          return amtA - amtB;
        default:
          return timeB - timeA;
      }
    });
  }, [filteredTransactions, sortOption]);

  // 3. PAGINATION (POST-FILTERING)
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, safeCurrentPage, pageSize]);

  // Reset page when filters change
  const handleFilterChange = (setter: any, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const formattedData = sortedTransactions.map((p) => {
      const clientName = p.client_name || p.trader_name || 'Client';
      const clientPhone = p.client_phone || p.trader_phone || '—';
      const dateStr = formatDate(p.transaction_time || p.created_at, true);

      let empCredit = p.employee_name || 'Direct';
      if (p.allocations && p.allocations.length > 0) {
        empCredit = p.allocations
          .map((a) => `${a.employee_name || 'Staff'} (₹${Number(a.allocation_amount).toLocaleString('en-IN')})`)
          .join('; ');
      }

      return {
        'Date & Time': dateStr,
        'Client Name': clientName,
        'Phone Number': clientPhone,
        'Amount (INR)': Number(p.amount || 0),
        'Service Category': p.service_category || 'Equity',
        'Service Type': p.service_type || '—',
        'Duration': p.subscription_duration || '—',
        'Credited Staff': empCredit,
        'Payment Mode': p.payment_mode || 'UPI',
        'UTR / Ref No': p.utr || '—',
        'Status': p.status,
      };
    });

    const safeMonthSlug = monthLabel.toLowerCase().replace(/\s+/g, '-');
    exportToCSV(formattedData, `monthly-sales-${safeMonthSlug}`);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
        <div className="h-5 w-56 bg-slate-100 rounded" />
        <div className="h-64 bg-slate-50 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 font-sans">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/10">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Monthly Transactions Ledger — {monthLabel}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Verified sales transactions, client references, and staff credit records for {monthLabel}
            </p>
          </div>
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={sortedTransactions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-40 self-start sm:self-auto active:scale-95"
          title="Download monthly sales report in CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Monthly CSV</span>
        </button>
      </div>

      {/* ── Enhanced Filter & Search Toolbar Ribbon ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Executive Styled Search Bar */}
        <div className="relative flex-1 max-w-lg flex items-center bg-slate-50/90 hover:bg-white focus-within:bg-white border border-slate-200/90 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl shadow-xs transition-all px-3.5 py-1.5 group">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-2.5 group-focus-within:bg-blue-600 group-focus-within:text-white transition-colors">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
            placeholder="Search client, phone, UTR reference, staff credit..."
            className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-slate-800 placeholder-slate-400 py-1"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => handleFilterChange(setSearchQuery, '')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0 ml-1"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded shrink-0">
              {filteredTransactions.length} items
            </span>
          )}
        </div>

        {/* Right: Quick Segmented Status & Dropdown Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Status Filter Segmented Pills */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => handleFilterChange(setStatusFilter, 'all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange(setStatusFilter, 'approved')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({statusCounts.approved})
            </button>
            {statusCounts.pending > 0 && (
              <button
                type="button"
                onClick={() => handleFilterChange(setStatusFilter, 'pending_verification')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending_verification'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({statusCounts.pending})
              </button>
            )}
          </div>

          {/* Market Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
              className="pl-3 pr-8 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all shadow-2xs"
            >
              <option value="all">All Markets</option>
              <option value="Equity">Equity</option>
              <option value="Commodity">Commodity</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => handleFilterChange(setSortOption, e.target.value)}
              className="pl-3 pr-8 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all shadow-2xs"
            >
              <option value="newest">Newest Date</option>
              <option value="oldest">Oldest Date</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Transactions Table Content ── */}
      {sortedTransactions.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2 bg-slate-50/50">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700">No transactions found for {monthLabel}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No sales records match your active search terms or filters.'
              : `No payment transactions have been recorded for ${monthLabel} yet.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50/80 font-mono">
                <th className="py-3 px-4 font-bold">Date & Time</th>
                <th className="py-3 px-4 font-bold">Client / Trader</th>
                <th className="py-3 px-4 font-bold">Plan & Duration</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold">Staff Attribution</th>
                <th className="py-3 px-4 font-bold">UTR / Mode</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-center">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.map((payment) => {
                const clientName = payment.client_name || payment.trader_name || 'Client';
                const clientPhone = payment.client_phone || payment.trader_phone || '';
                const txTime = payment.transaction_time || payment.created_at;
                const isShared = Boolean(
                  payment.is_shared || (payment.allocations && payment.allocations.length > 1)
                );

                return (
                  <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-extrabold text-slate-900 font-mono text-xs block">
                        {formatDate(txTime, false)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(txTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </td>

                    {/* Client & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 text-xs">{clientName}</div>
                      {clientPhone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{clientPhone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(clientPhone, `phone-${payment.id}`)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy phone number"
                          >
                            {copiedId === `phone-${payment.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Service & Duration */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold font-mono bg-blue-50 text-blue-700 border border-blue-100">
                        {payment.service_category || 'Equity'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                        {payment.subscription_duration || 'Standard'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      {formatINR(payment.amount)}
                    </td>

                    {/* Credited Employee / Allocations */}
                    <td className="py-3.5 px-4">
                      {isShared && payment.allocations ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Layers className="w-2.5 h-2.5" /> Shared ({payment.allocations.length})
                          </span>
                          <div className="text-[10px] text-slate-500 leading-tight">
                            {payment.allocations.map((a, idx) => (
                              <span key={idx} className="block whitespace-nowrap font-medium">
                                {a.employee_name || 'Staff'}: <strong className="font-bold text-slate-800">{formatINR(a.allocation_amount)}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-extrabold text-slate-800 text-xs">
                          {payment.employee_name || 'Direct / Head Office'}
                        </span>
                      )}
                    </td>

                    {/* UTR & Payment Mode */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-mono text-xs text-slate-800">
                        <span className="font-semibold select-all" title={payment.utr}>
                          {payment.utr || '—'}
                        </span>
                        {payment.utr && (
                          <button
                            type="button"
                            onClick={() => handleCopy(payment.utr, `utr-${payment.id}`)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy UTR"
                          >
                            {copiedId === `utr-${payment.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {payment.payment_mode || 'UPI'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={payment.status} />
                    </td>

                    {/* Proof Preview Action */}
                    <td className="py-3.5 px-4 text-center">
                      {payment.screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => onPreviewProof && onPreviewProof(payment.screenshot_url)}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
                          title="View Payment Proof Screenshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {sortedTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold font-mono bg-white cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="font-mono text-[11px] text-slate-400">
              Showing {(safeCurrentPage - 1) * pageSize + 1}–
              {Math.min(safeCurrentPage * pageSize, sortedTransactions.length)} of {sortedTransactions.length}
            </span>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all active:scale-95"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-100 font-mono font-bold text-slate-800 text-xs">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all active:scale-95"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
