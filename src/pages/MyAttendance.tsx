import React, { useEffect, useMemo, useState } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MyAttendance() {
  const { user } = useAuth();
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const monthRange = useMemo(() => {
    const [y, m] = month.split('-').map((x) => parseInt(x, 10));
    const first = startOfMonth(new Date(y, m - 1, 1));
    const last = endOfMonth(first);
    return { first, last };
  }, [month]);

  useEffect(() => {
    if (!user) return;
    fetchMonth();

    const channel = supabase
      .channel('my-attendance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${user.id}` },
        () => fetchMonth()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, month]);

  async function fetchMonth() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthRange.first, 'yyyy-MM-dd'))
        .lte('date', format(monthRange.last, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      if (error) throw error;
      setRecords((data as any) || []);
    } catch (e) {
      // noop visual, could show toast
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const data: { date: string; present: number; absent: number }[] = [];
    const days = (monthRange.last.getDate() - monthRange.first.getDate()) + 1;
    for (let i = 0; i < days; i++) {
      const d = addDays(monthRange.first, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const rec = records.find((r) => r.date === dateStr);
      data.push({
        date: format(d, 'dd'),
        present: rec && (rec.status === 'present' || rec.status === 'late') ? 1 : 0,
        absent: rec && rec.status === 'absent' ? 1 : 0,
      });
    }
    return data;
  }, [records, monthRange]);

  const totals = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let days = 0;
    for (const r of records) {
      days += 1;
      if (r.status === 'present') present += 1;
      else if (r.status === 'late') late += 1;
      else if (r.status === 'absent') absent += 1;
    }
    return { present, late, absent, days };
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            My Attendance
          </h1>
          <p className="text-gray-600">Monthly trend and attendance history</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Present</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{totals.present}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Late</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{totals.late}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Absent</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{totals.absent}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Monthly Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="present" fill="#388E3C" name="Present" />
            <Bar dataKey="absent" fill="#D32F2F" name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{format(new Date(r.date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3 text-sm">{r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.total_hours?.toString() || '0'}</td>
                  <td className="px-4 py-3 text-sm capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex items-center justify-center h-24">
            <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}


