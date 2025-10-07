import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Doc = {
  id: string;
  title: string;
  category: string | null;
  file_url: string;
  visible_to: 'all' | 'employee' | 'admin';
  created_at: string;
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', category: '', file_url: '', visible_to: 'all' as Doc['visible_to'] });

  useEffect(() => {
    fetchRows();
    const ch = supabase
      .channel('documents-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, fetchRows)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchRows() {
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  }

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!user || user.role !== 'admin') return;
    const payload = { ...form, uploaded_by: user.id } as any;
    if (!payload.title || !payload.file_url) {
      alert('Title and file URL are required');
      return;
    }
    const { error } = await supabase.from('documents').insert(payload);
    if (error) alert(error.message);
    else setForm({ title: '', category: '', file_url: '', visible_to: 'all' });
  }

  async function removeDoc(id: string) {
    if (!user || user.role !== 'admin') return;
    if (!confirm('Delete this document?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Documents</h1>
          <p className="text-gray-600">Company policies, forms, and resources</p>
        </div>
      </div>

      {user?.role === 'admin' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Add Document</h2>
          <form onSubmit={addDoc} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="File URL (public)" className="px-4 py-3 bg-white border border-gray-300 rounded-xl" />
            <select value={form.visible_to} onChange={(e) => setForm({ ...form, visible_to: e.target.value as Doc['visible_to'] })} className="px-4 py-3 bg-white border border-gray-300 rounded-xl">
              <option value="all">All</option>
              <option value="employee">Employees</option>
              <option value="admin">Admins</option>
            </select>
            <div className="md:col-span-4">
              <button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Add</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Visibility</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{d.title}</td>
                <td className="px-4 py-3 text-sm">{d.category || '-'}</td>
                <td className="px-4 py-3 text-sm capitalize">{d.visible_to}</td>
                <td className="px-4 py-3 text-sm">
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-[#0066CC] hover:underline mr-3">View</a>
                  {user?.role === 'admin' && (
                    <button onClick={() => removeDoc(d.id)} className="text-[#D32F2F] hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="flex items-center justify-center h-24">
            <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}


