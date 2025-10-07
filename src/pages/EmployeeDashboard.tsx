import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TodayAttendance {
  id?: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  total_hours: number;
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchNotifications();
      fetchHolidays();

      const channel = supabase
        .channel('employee-attendance')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTodayAttendance();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setNotifications((data as any) || []);
  }

  async function fetchHolidays() {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('holidays')
      .select('date,name')
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .limit(5);
    setUpcomingHolidays((data as any) || []);
  }

  async function fetchTodayAttendance() {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      setAttendance(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    if (!user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const currentTime = new Date();
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();

      const isLate = hours > 9 || (hours === 9 && minutes > 15);

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          date: today,
          check_in_time: now,
          status: isLate ? 'late' : 'present',
          source: 'web',
        })
        .select()
        .single();

      if (error) throw error;

      setAttendance(data);
      setMessage({
        type: 'success',
        text: `Checked in at ${format(new Date(now), 'HH:mm')}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to check in',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!user || !attendance?.id) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const now = new Date().toISOString();
      const checkInTime = new Date(attendance.check_in_time!);
      const checkOutTime = new Date(now);
      const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: now,
          total_hours: parseFloat(hours.toFixed(2)),
        })
        .eq('id', attendance.id)
        .select()
        .single();

      if (error) throw error;

      setAttendance(data);
      setMessage({
        type: 'success',
        text: `Checked out. Total hours: ${hours.toFixed(2)}`,
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to check out',
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Attendance action windows
  function isBeforeCheckinStart(now: Date) {
    const start = new Date(now);
    start.setHours(9, 15, 0, 0);
    return now.getTime() < start.getTime();
  }
  function isAfterCheckinEnd(now: Date) {
    const end = new Date(now);
    end.setHours(12, 0, 0, 0);
    return now.getTime() > end.getTime();
  }
  function isAfterCheckoutCutoff(now: Date) {
    const cutoff = new Date(now);
    cutoff.setHours(15, 55, 0, 0);
    return now.getTime() > cutoff.getTime();
  }
  function isBeforeCheckoutOpen(now: Date) {
    const open = new Date(now);
    open.setHours(9, 15, 0, 0);
    return now.getTime() < open.getTime();
  }

  const nowLocal = new Date();
  const baseCanCheckIn = !attendance?.check_in_time;
  const baseCanCheckOut = attendance?.check_in_time && !attendance?.check_out_time;
  const canCheckIn = baseCanCheckIn && !isBeforeCheckinStart(nowLocal) && !isAfterCheckinEnd(nowLocal) && !isAfterCheckoutCutoff(nowLocal);
  const canCheckOut = baseCanCheckOut && !isBeforeCheckoutOpen(nowLocal) && !isAfterCheckoutCutoff(nowLocal);

  async function downloadMonthlyReport() {
    if (!user) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const first = new Date(y, m, 1).toISOString().split('T')[0];
      const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', first)
        .lte('date', last)
        .order('date', { ascending: true });
      if (error) throw error;
      const rows = (data as any[]) || [];
      const csv = [
        ['Date', 'Check In', 'Check Out', 'Hours', 'Status'].join(','),
        ...rows.map(r => [
          r.date,
          r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-',
          r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-',
          r.total_hours ?? 0,
          r.status
        ].join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${y}-${String(m + 1).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Failed to export monthly report');
    }
  }

  async function exportWeeklyTimesheet() {
    if (!user) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const first = new Date(y, m, 1).toISOString().split('T')[0];
      const last = new Date(y, m + 1, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('date, total_hours, status')
        .eq('user_id', user.id)
        .gte('date', first)
        .lte('date', last)
        .order('date', { ascending: true });
      if (error) throw error;
      const rows: any[] = data || [];
      const weekMap: Record<string, { from: string; to: string; days: number; hours: number } > = {};
      rows.forEach((r) => {
        const d = parseISO(r.date);
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const we = endOfWeek(d, { weekStartsOn: 1 });
        const key = `${format(ws, 'yyyy-MM-dd')}..${format(we, 'yyyy-MM-dd')}`;
        if (!weekMap[key]) weekMap[key] = { from: format(ws, 'yyyy-MM-dd'), to: format(we, 'yyyy-MM-dd'), days: 0, hours: 0 };
        if (r.status !== 'onLeave') weekMap[key].days += 1;
        weekMap[key].hours += Number(r.total_hours || 0);
      });

      const sheetRows = Object.values(weekMap).map((w) => ({ Week: `${w.from} to ${w.to}`, WorkingDays: w.days, TotalHours: Number(w.hours.toFixed(2)) }));

      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet_${y}-${String(m + 1).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // Fallback to CSV
        const csv = [ ['Week','WorkingDays','TotalHours'].join(','), ...sheetRows.map(r => [r.Week, r.WorkingDays, r.TotalHours].join(',')) ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet_${y}-${String(m + 1).padStart(2, '0')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to export timesheet');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2E2E2E] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Welcome, {user?.name}
        </h1>
        <p className="text-gray-600">Manage your attendance and view your records</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-[#388E3C] flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#D32F2F] flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-[#388E3C]' : 'text-[#D32F2F]'}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#E31837] rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Today's Attendance
              </h2>
              <p className="text-sm text-gray-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>

          {attendance?.check_in_time && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Check In</span>
                <span className="text-lg font-bold text-[#388E3C]">
                  {format(new Date(attendance.check_in_time), 'HH:mm')}
                </span>
              </div>

              {attendance.check_out_time && (
                <>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Check Out</span>
                    <span className="text-lg font-bold text-[#0066CC]">
                      {format(new Date(attendance.check_out_time), 'HH:mm')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Total Hours</span>
                    <span className="text-lg font-bold text-purple-600">{attendance.total_hours} hrs</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span
                  className={`text-sm font-bold uppercase px-3 py-1 rounded-lg ${
                    attendance.status === 'present'
                      ? 'bg-green-100 text-[#388E3C]'
                      : attendance.status === 'late'
                      ? 'bg-orange-100 text-[#FF9800]'
                      : 'bg-red-100 text-[#D32F2F]'
                  }`}
                >
                  {attendance.status}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheckIn}
              disabled={!canCheckIn || actionLoading}
              className="w-full bg-[#388E3C] hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <CheckCircle className="w-5 h-5" />
              {actionLoading ? 'Checking in...' : canCheckIn ? 'Check In' : 'Already Checked In'}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={!canCheckOut || actionLoading}
              className="w-full bg-[#0066CC] hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <XCircle className="w-5 h-5" />
              {actionLoading ? 'Checking out...' : canCheckOut ? 'Check Out' : 'Check Out Not Available'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Quick Actions
            </h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/my-leaves')}
              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <p className="font-medium text-[#2E2E2E]">Request Leave</p>
              <p className="text-sm text-gray-600">Apply for sick, casual, or earned leave</p>
            </button>

            <button
              onClick={() => navigate('/my-attendance')}
              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <p className="font-medium text-[#2E2E2E]">View History</p>
              <p className="text-sm text-gray-600">Check your attendance records</p>
            </button>

            <button
              onClick={downloadMonthlyReport}
              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <p className="font-medium text-[#2E2E2E]">Monthly Report</p>
              <p className="text-sm text-gray-600">Download your attendance report</p>
            </button>

            <button
              onClick={() => navigate('/regularizations')}
              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <p className="font-medium text-[#2E2E2E]">Regularize Today</p>
              <p className="text-sm text-gray-600">Prefill today and request correction</p>
            </button>

            <button
              onClick={exportWeeklyTimesheet}
              className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <p className="font-medium text-[#2E2E2E]">Timesheet (XLSX)</p>
              <p className="text-sm text-gray-600">Weekly summary for this month</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#E31837] rounded-xl flex items-center justify-center">
              <BellIcon />
            </div>
            <h2 className="text-xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Recent Notifications
            </h2>
          </div>
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-[#2E2E2E]">{n.title}</p>
                <p className="text-xs text-gray-600">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-gray-500">No recent notifications</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Upcoming Holidays
            </h2>
          </div>
          <div className="space-y-2">
            {upcomingHolidays.map((h) => (
              <div key={h.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700">{h.name}</span>
                <span className="text-sm font-medium text-[#2E2E2E]">{format(new Date(h.date), 'MMM dd, yyyy')}</span>
              </div>
            ))}
            {upcomingHolidays.length === 0 && (
              <p className="text-sm text-gray-500">No upcoming holidays</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
