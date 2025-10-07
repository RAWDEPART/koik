import React, { useEffect, useState } from 'react';
import { supabase, Attendance, User } from '../lib/supabase';
import { Calendar, Clock, Filter, Download, CreditCard as Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<(Attendance & { user: User })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedDepartment, selectedUser]);

  async function fetchData() {
    try {
      setLoading(true);

      const [usersResult, attendanceResult] = await Promise.all([
        supabase.from('users').select('*').eq('is_active', true),
        supabase
          .from('attendance')
          .select('*, user:users(*)')
          .eq('date', selectedDate)
          .order('check_in_time', { ascending: true }),
      ]);

      if (usersResult.data) setUsers(usersResult.data);

      let filteredAttendance = attendanceResult.data || [];

      if (selectedDepartment !== 'all') {
        filteredAttendance = filteredAttendance.filter(
          (a: any) => a.user?.department === selectedDepartment
        );
      }

      if (selectedUser !== 'all') {
        filteredAttendance = filteredAttendance.filter((a: any) => a.user_id === selectedUser);
      }

      setAttendance(filteredAttendance as any);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const csv = [
      ['Employee ID', 'Name', 'Department', 'Check In', 'Check Out', 'Total Hours', 'Status'].join(','),
      ...attendance.map((a) =>
        [
          a.user.emp_id,
          a.user.name,
          a.user.department || 'N/A',
          a.check_in_time ? format(new Date(a.check_in_time), 'HH:mm') : '-',
          a.check_out_time ? format(new Date(a.check_out_time), 'HH:mm') : '-',
          a.total_hours || 0,
          a.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
  }

  async function handleEdit(recordId: string) {
    const checkIn = prompt('Enter Check In time (HH:mm) or leave blank to keep');
    const checkOut = prompt('Enter Check Out time (HH:mm) or leave blank to keep');
    const status = prompt("Enter status: present | late | absent | onLeave (leave blank to keep)");

    const updates: any = {};
    const todayDate = selectedDate;
    if (checkIn && /^\d{2}:\d{2}$/.test(checkIn)) {
      updates.check_in_time = new Date(`${todayDate}T${checkIn}:00Z`).toISOString();
    }
    if (checkOut && /^\d{2}:\d{2}$/.test(checkOut)) {
      updates.check_out_time = new Date(`${todayDate}T${checkOut}:00Z`).toISOString();
    }
    if (status && ['present','late','absent','onLeave'].includes(status)) {
      updates.status = status as any;
    }

    if (updates.check_in_time && updates.check_out_time) {
      const hours = (new Date(updates.check_out_time).getTime() - new Date(updates.check_in_time).getTime())/(1000*60*60);
      updates.total_hours = parseFloat(hours.toFixed(2));
    }

    if (Object.keys(updates).length === 0) return;

    try {
      const { error } = await supabase.from('attendance').update(updates).eq('id', recordId);
      if (error) throw error;
      fetchData();
      alert('Attendance updated');
    } catch (e: any) {
      alert(e.message || 'Failed to update');
    }
  }

  const departments = [...new Set(users.map((u) => u.department).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Attendance Management
          </h1>
          <p className="text-gray-600">View and manage employee attendance records</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#0066CC] hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            >
              <option value="all">All Employees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.emp_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Check Out</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-[#2E2E2E]">{record.user.name}</p>
                      <p className="text-sm text-gray-600">{record.user.emp_id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{record.user.department || 'N/A'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-[#2E2E2E]">{record.total_hours || 0} hrs</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : record.status === 'late'
                          ? 'bg-orange-100 text-orange-700'
                          : record.status === 'onLeave'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => handleEdit(record.id)}>
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {attendance.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No attendance records found for selected filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
