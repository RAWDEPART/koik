import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Reg = { id: string; user_id: string; date: string; reason: string | null; status: 'pending'|'approved'|'rejected'; review_note?: string | null };

export default function RegularizationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Reg[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchRows();
    const ch = supabase.channel('regs-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'regularizations' }, fetchRows).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRows() {
    const query = user?.role === 'admin' ? supabase.from('regularizations').select('*') : supabase.from('regularizations').select('*').eq('user_id', user?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setRows((data as any) || []);
  }

  async function submitReg(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('regularizations').insert({ user_id: user?.id, date, reason });
    if (error) alert(error.message);
    else { setReason(''); fetchRows(); }
  }

  async function act(id: string, status: 'approved'|'rejected') {
    if (user?.role !== 'admin') return;
    const note = prompt('Add note (optional)') || '';
    const { error } = await supabase.from('regularizations').update({ status, review_note: note, reviewed_by: user.id }).eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Regularizations</h1>
          <p className="text-gray-600">Request corrections for missed check-ins/outs</p>
        </div>
      </div>

      {user?.role === 'employee' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <form onSubmit={submitReg} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="px-4 py-3 bg-white border border-gray-300 rounded-xl md:col-span-2" />
            <button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Submit</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Reason</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
              {user?.role==='admin' && <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{r.date}</td>
                <td className="px-4 py-3 text-sm">{r.reason || '-'}</td>
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


