import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Expense = { id: string; user_id: string; amount: number; category: string | null; description: string | null; receipt_url: string | null; status: 'pending'|'approved'|'rejected' };

export default function ExpensesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [form, setForm] = useState({ amount: '', category: 'Travel', description: '', receipt_url: '' });

  useEffect(() => {
    fetchRows();
    const ch = supabase.channel('expenses-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchRows).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRows() {
    const query = user?.role === 'admin' ? supabase.from('expenses').select('*') : supabase.from('expenses').select('*').eq('user_id', user?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setRows((data as any) || []);
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, user_id: user?.id, amount: parseFloat(form.amount || '0') } as any;
    const { error } = await supabase.from('expenses').insert(payload);
    if (error) alert(error.message);
    else setForm({ amount: '', category: 'Travel', description: '', receipt_url: '' });
  }

  async function act(id: string, status: 'approved'|'rejected') {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('expenses').update({ status, reviewed_by: user.id }).eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Expenses</h1>
          <p className="text-gray-600">Submit and track expense claims</p>
        </div>
      </div>

      {user?.role === 'employee' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <form onSubmit={submitExpense} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={form.receipt_url} onChange={(e) => setForm({ ...form, receipt_url: e.target.value })} placeholder="Receipt URL (optional)" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Submit</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
              {user?.role==='admin' && <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">₹{r.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{r.category || '-'}</td>
                <td className="px-4 py-3 text-sm">{r.description || '-'}</td>
                <td className="px-4 py-3 text-sm capitalize">{r.status}</td>
                {user?.role==='admin' && (
                  <td className="px-4 py-3 text-sm space-x-3">
                    <button onClick={() => act(r.id, 'approved')} className="text-[#388E3C] hover:underline">Approve</button>
                    <button onClick={() => act(r.id, 'rejected')} className="text-[#D32F2F] hover:underline">Reject</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


