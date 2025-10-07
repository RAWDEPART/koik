import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Ticket = { id: string; subject: string; description: string | null; status: 'open'|'in_progress'|'resolved'|'closed'; priority: 'low'|'normal'|'high'|'urgent'; user_id: string };

export default function HelpDeskPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' });

  useEffect(() => {
    fetchRows();
    const ch = supabase.channel('tickets-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchRows).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRows() {
    const query = user?.role === 'admin' ? supabase.from('tickets').select('*') : supabase.from('tickets').select('*').eq('user_id', user?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setRows((data as any) || []);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, user_id: user?.id } as any;
    const { error } = await supabase.from('tickets').insert(payload);
    if (error) alert(error.message);
    else setForm({ subject: '', description: '', priority: 'normal' });
  }

  async function setStatus(id: string, status: Ticket['status']) {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('tickets').update({ status }).eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Help Desk</h1>
          <p className="text-gray-600">Raise and track support tickets</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <form onSubmit={submitTicket} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="px-4 py-3 bg-white border border-gray-300 rounded-xl md:col-span-2" />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="md:col-span-4"><button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Create Ticket</button></div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
              {user?.role==='admin' && <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{t.subject}</td>
                <td className="px-4 py-3 text-sm capitalize">{t.priority}</td>
                <td className="px-4 py-3 text-sm capitalize">{t.status}</td>
                {user?.role==='admin' && (
                  <td className="px-4 py-3 text-sm space-x-3">
                    <button onClick={() => setStatus(t.id, 'in_progress')} className="text-[#0066CC] hover:underline">In Progress</button>
                    <button onClick={() => setStatus(t.id, 'resolved')} className="text-[#388E3C] hover:underline">Resolve</button>
                    <button onClick={() => setStatus(t.id, 'closed')} className="text-[#D32F2F] hover:underline">Close</button>
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


