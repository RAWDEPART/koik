import React, { useEffect, useState } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRows();
    const ch = supabase
      .channel('notifications-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchRows)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  async function fetchRows() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRows((data as any) || []);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    fetchRows();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Notifications</h1>
          <p className="text-gray-600">Your recent alerts and updates</p>
        </div>
        <button onClick={markAllRead} className="px-4 py-2 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl">Mark all as read</button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="space-y-4">
          {rows.map((n) => (
            <div key={n.id} className={`p-4 rounded-xl border ${n.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#2E2E2E]">{n.title}</p>
                  <p className="text-sm text-gray-700">{n.message}</p>
                </div>
                {!n.read && <span className="text-xs font-bold text-blue-700">NEW</span>}
              </div>
            </div>
          ))}
          {rows.length === 0 && !loading && <p className="text-gray-600">No notifications</p>}
        </div>
      </div>
    </div>
  );
}


