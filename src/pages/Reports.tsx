import React, { useEffect, useState } from 'react';
import { supabase, Attendance, User } from '../lib/supabase';
import { format } from 'date-fns';

export default function Reports() {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<(Attendance & { user: User })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, date]);

  async function fetchData() {
    setLoading(true);
    try {
      let query = supabase.from('attendance').select('*, user:users(*)');
      const d = new Date(date);
      if (range === 'daily') {
        query = query.eq('date', format(d, 'yyyy-MM-dd'));
      } else if (range === 'weekly') {
        const start = new Date(d);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(start.setDate(diff));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        query = query.gte('date', format(weekStart, 'yyyy-MM-dd')).lte('date', format(weekEnd, 'yyyy-MM-dd'));
      } else {
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        query = query.gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd'));
      }
      const { data, error } = await query.order('date', { ascending: true });
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const csv = [
      ['Date', 'Employee ID', 'Name', 'Department', 'Check In', 'Check Out', 'Hours', 'Status'].join(','),
      ...rows.map((r) =>
        [
          r.date,
          r.user.emp_id,
          r.user.name,
          r.user.department || 'N/A',
          r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-',
          r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-',
          r.total_hours || 0,
          r.status,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${range}_${date}.csv`;
    a.click();
  }

  function printPDF() {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!doctype html><html><head><title>Attendance Report</title>
    <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;font-size:12px} th{background:#f5f5f5}</style>
    </head><body>
    <h2>Attendance Report (${range}) - ${date}</h2>
    <table><thead><tr>
    <th>Date</th><th>Emp ID</th><th>Name</th><th>Dept</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>
    </tr></thead><tbody>
    ${rows
      .map(
        (r) => `<tr>
        <td>${r.date}</td><td>${r.user.emp_id}</td><td>${r.user.name}</td><td>${r.user.department || 'N/A'}</td>
        <td>${r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-'}</td>
        <td>${r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-'}</td>
        <td>${r.total_hours || 0}</td><td>${r.status}</td>
      </tr>`
      )
      .join('')}
    </tbody></table>
    </body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Reports
          </h1>
          <p className="text-gray-600">Generate and export attendance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          />
          <button onClick={exportCSV} className="px-4 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl font-medium">
            Export CSV
          </button>
          <button onClick={printPDF} className="px-4 py-3 bg-[#388E3C] hover:bg-green-700 text-white rounded-xl font-medium">
            Print PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Employee</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check In</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check Out</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Hours</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{format(new Date(r.date), 'MMM dd, yyyy')}</td>
                <td className="px-4 py-3 text-sm">{r.user.name} ({r.user.emp_id})</td>
                <td className="px-4 py-3 text-sm">{r.user.department || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-'}</td>
                <td className="px-4 py-3 text-sm">{r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-'}</td>
                <td className="px-4 py-3 text-sm">{r.total_hours || 0}</td>
                <td className="px-4 py-3 text-sm capitalize">{r.status}</td>
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


