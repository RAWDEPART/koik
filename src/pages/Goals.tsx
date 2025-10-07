import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Goal = { id: string; user_id: string; title: string; description: string | null; due_date: string | null; status: 'active'|'paused'|'completed'; progress: number };

export default function GoalsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Goal[]>([]);
  const [form, setForm] = useState({ title: '', description: '', due_date: '' });

  useEffect(() => {
    fetchRows();
    const ch = supabase.channel('goals-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, fetchRows).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRows() {
    const query = user?.role === 'admin' ? supabase.from('goals').select('*') : supabase.from('goals').select('*').eq('user_id', user?.id);
    const { data } = await query.order('created_at', { ascending: false });
    setRows((data as any) || []);
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, user_id: user?.id } as any;
    const { error } = await supabase.from('goals').insert(payload);
    if (error) alert(error.message);
    else setForm({ title: '', description: '', due_date: '' });
  }

  async function setProgress(id: string) {
    const input = prompt('Progress (0-100)');
    if (!input) return;
    const progress = Math.max(0, Math.min(100, parseInt(input, 10)));
    const { error } = await supabase.from('goals').update({ progress }).eq('id', id);
    if (error) alert(error.message);
  }

  async function setStatus(id: string, status: Goal['status']) {
    const { error } = await supabase.from('goals').update({ status }).eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Goals</h1>
          <p className="text-gray-600">Define objectives and track progress</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <form onSubmit={addGoal} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="px-4 py-3 bg-white border border-gray-300 rounded-xl md:col-span-2" />
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
          <div className="md:col-span-4"><button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Add Goal</button></div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Due</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Progress</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{g.title}</td>
                <td className="px-4 py-3 text-sm">{g.due_date || '-'}</td>
                <td className="px-4 py-3 text-sm capitalize">{g.status}</td>
                <td className="px-4 py-3 text-sm">{g.progress}%</td>
                <td className="px-4 py-3 text-sm space-x-3">
                  <button onClick={() => setProgress(g.id)} className="text-[#0066CC] hover:underline">Set Progress</button>
                  <button onClick={() => setStatus(g.id, 'completed')} className="text-[#388E3C] hover:underline">Complete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


