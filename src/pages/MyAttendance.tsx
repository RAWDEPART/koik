import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, Attendance } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MyAttendance() {
  const { user } = useAuth();
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);

  const monthRange = useMemo(() => {
    const [y, m] = month.split('-').map((x) => parseInt(x, 10));
    const first = startOfMonth(new Date(y, m - 1, 1));
    const last = endOfMonth(first);
    return { first, last };
  }, [month]);

  useEffect(() => {
    if (!user) return;
    fetchMonth();
    fetchToday();

    const channel = supabase
      .channel('my-attendance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${user.id}` },
        () => { fetchMonth(); fetchToday(); }
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
      setRecords(((data as unknown) as Attendance[]) || []);
    } catch {
      // noop visual, could show toast
    } finally {
      setLoading(false);
    }
  }

  async function fetchToday() {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord((data as unknown as Attendance) || null);
  }

  function getNowParts() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return { now, hours, minutes };
  }

  const isWithinCheckInWindow = useCallback((): boolean => {
    const { hours, minutes } = getNowParts();
    // Allowed from 09:15 to 23:59 local time
    const afterStart = (hours > 9) || (hours === 9 && minutes >= 15);
    return afterStart; // 23:59 bound is implicit for the day
  }, []);

  const isWithinCheckOutWindow = useCallback((): boolean => {
    const { hours, minutes } = getNowParts();
    // Allowed until 15:55 inclusive
    const beforeEnd = (hours < 15) || (hours === 15 && minutes <= 55);
    return beforeEnd;
  }, []);

  const canCheckIn = useMemo(() => {
    if (!user) return false;
    if (todayRecord?.check_in_time) return false; // already checked in
    return isWithinCheckInWindow();
  }, [user, todayRecord, isWithinCheckInWindow]);

  const canCheckOut = useMemo(() => {
    if (!user) return false;
    if (!todayRecord?.check_in_time) return false; // only after check-in
    if (todayRecord?.check_out_time) return false; // already checked out
    return isWithinCheckOutWindow();
  }, [user, todayRecord, isWithinCheckOutWindow]);

  async function handleCheckIn() {
    if (!user) return;
    if (!isWithinCheckInWindow()) {
      alert('Check-in allowed between 09:15 and 23:59.');
      return;
    }
    const { now } = getNowParts();
    const today = format(now, 'yyyy-MM-dd');
    const checkInIso = now.toISOString();

    // Ensure there is at most one record per user/day
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if ((existing as { id: string } | null)?.id) {
      const { error } = await supabase
        .from('attendance')
        .update({ check_in_time: checkInIso, status: 'present' })
        .eq('id', (existing as { id: string }).id);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase.from('attendance').insert({
        user_id: user.id,
        date: today,
        check_in_time: checkInIso,
        status: 'present',
      });
      if (error) { alert(error.message); return; }
    }

    await fetchToday();
    await fetchMonth();
  }

  async function handleCheckOut() {
    if (!user || !todayRecord?.check_in_time) return;
    if (!isWithinCheckOutWindow()) {
      alert('Checkout allowed only until 15:55.');
      return;
    }
    const now = new Date();
    const checkOutIso = now.toISOString();
    const checkIn = new Date(todayRecord.check_in_time);
    const ms = now.getTime() - checkIn.getTime();
    const hours = parseFloat((ms / (1000 * 60 * 60)).toFixed(2));

    const { error } = await supabase
      .from('attendance')
      .update({ check_out_time: checkOutIso, total_hours: hours, status: 'present' })
      .eq('id', todayRecord.id);
    if (error) { alert(error.message); return; }

    await fetchToday();
    await fetchMonth();
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

      <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[#2E2E2E]">
          <Clock className="w-5 h-5" />
          <span>
            Today: {format(new Date(), 'yyyy-MM-dd')} •
            {todayRecord?.check_in_time ? ` In: ${format(new Date(todayRecord.check_in_time), 'HH:mm')}` : ' Not checked in'}
            {todayRecord?.check_out_time ? ` • Out: ${format(new Date(todayRecord.check_out_time), 'HH:mm')}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
              canCheckIn ? 'bg-[#388E3C] hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Check In
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!canCheckOut}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
              canCheckOut ? 'bg-[#E31837] hover:bg-[#C4152E] text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Check Out
          </button>
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


