import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Expense } from '../../types';
import { formatINR } from '../../lib/calculations';
import { Receipt, Plus, X, Tag } from 'lucide-react';

export const ExpenseModule: React.FC = () => {
  const { expenses, addExpense } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'Ads',
    amount: 10000,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoriesMap = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;

    addExpense({
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
      date: form.date,
    });

    setIsAddModalOpen(false);
    setForm({ category: 'Ads', amount: 10000, description: '', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Expenses Management</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Track software, advertising, salaries, and operational costs</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/10 cursor-pointer border-none transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 text-white" /> Add Expense
        </button>
      </div>

      {/* Summary KPI + Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Monthly Expenses</span>
          <h3 className="text-2xl font-black text-rose-700 mt-1">{formatINR(totalExpenses)}</h3>
        </div>

        {Object.entries(categoriesMap).map(([cat, amt]) => (
          <div key={cat} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">{cat} Costs</span>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{formatINR(amt)}</h3>
          </div>
        ))}
      </div>

      {/* Mobile View: Expenses Card Stack */}
      <div className="md:hidden block space-y-3 font-sans">
        {expenses.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center text-slate-500 shadow-sm">
            No expenses found.
          </div>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                    {expense.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1.5">{expense.description}</h4>
                </div>
                <span className="text-xs font-black text-rose-700 font-mono">{formatINR(expense.amount)}</span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                <span>By: {expense.added_by_name || 'Admin'}</span>
                <span>Date: {expense.date}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Heavy Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-600 uppercase text-[10px] tracking-wider bg-[#091A2F]/5">
                <th className="py-3.5 px-4 text-slate-500">Date</th>
                <th className="py-3.5 px-4 text-slate-500">Category</th>
                <th className="py-3.5 px-4 text-slate-500">Description</th>
                <th className="py-3.5 px-4 text-slate-500">Added By</th>
                <th className="py-3.5 px-4 text-right text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100/40">
                  <td className="py-3.5 px-4 text-slate-700 font-medium font-mono">{expense.date}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-855 font-medium">{expense.description}</td>
                  <td className="py-3.5 px-4 text-slate-500">{expense.added_by_name || 'Admin'}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-700 font-mono">{formatINR(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#091A2F]">Log Business Expense</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm font-medium"
                >
                  <option value="Ads">Ads / Marketing</option>
                  <option value="Software">Software & Subscriptions</option>
                  <option value="Salary">Salary & Commissions</option>
                  <option value="Office">Office & Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="text-slate-500 font-mono uppercase block text-[10px] font-bold mb-1">Description / Vendor</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Meta Ads August Campaign"
                  className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/10 cursor-pointer border-none transition-all active:scale-95"
              >
                Save Expense Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
