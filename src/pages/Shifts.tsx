import React, { useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Shift = { id: string; user_id: string; date: string; start_time: string; end_time: string; user?: User };

export default function ShiftsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ user_id: '', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '18:00' });

  useEffect(() => {
    fetchRows();
    if (user?.role === 'admin') fetchUsers();
    const ch = supabase.channel('shifts-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, fetchRows).subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  async function fetchRows() {
    const sel = user?.role === 'admin' ? '*' : `*`;
    const query = supabase.from('shifts').select(sel).order('date', { ascending: true });
    const { data } = await query;
    setRows((data as any) || []);
  }

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').eq('is_active', true).order('name');
    setUsers((data as any) || []);
  }

  async function addShift(e: React.FormEvent) {
    e.preventDefault();
    if (user?.role !== 'admin') return;
    const payload = { ...form } as any;
    if (!payload.user_id) payload.user_id = users[0]?.id;
    const { error } = await supabase.from('shifts').insert(payload);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Shifts</h1>
          <p className="text-gray-600">View upcoming shifts{user?.role === 'admin' ? ' and assign new ones' : ''}</p>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <form onSubmit={addShift} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl">
              <option value="">Select Employee</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.emp_id})</option>
              ))}
            </select>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Assign</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Start</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{r.date}</td>
                <td className="px-4 py-3 text-sm">{users.find((u) => u.id === r.user_id)?.name || r.user_id}</td>
                <td className="px-4 py-3 text-sm">{r.start_time}</td>
                <td className="px-4 py-3 text-sm">{r.end_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


