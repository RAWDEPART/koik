import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, UserX, Clock, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingLeaves: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchWeeklyData();

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        fetchStats();
        fetchWeeklyData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStats() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [usersResult, attendanceResult, leavesResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('attendance').select('status', { count: 'exact' }).eq('date', today),
        supabase.from('leaves').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);

      const total = usersResult.count || 0;
      const attendanceRecords = attendanceResult.data || [];

      const present = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
      const late = attendanceRecords.filter(a => a.status === 'late').length;
      const absent = attendanceRecords.filter(a => a.status === 'absent').length;

      setStats({
        totalEmployees: total,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        pendingLeaves: leavesResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeeklyData() {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);

      const { data } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', weekAgo.toISOString().split('T')[0])
        .lte('date', today.toISOString().split('T')[0]);

      const groupedData: { [key: string]: { present: number; absent: number; late: number } } = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekAgo);
        date.setDate(weekAgo.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        groupedData[dateStr] = { present: 0, absent: 0, late: 0 };
      }

      data?.forEach((record) => {
        if (groupedData[record.date]) {
          if (record.status === 'present' || record.status === 'late') {
            groupedData[record.date].present++;
          }
          if (record.status === 'late') {
            groupedData[record.date].late++;
          }
          if (record.status === 'absent') {
            groupedData[record.date].absent++;
          }
        }
      });

      const chartData = Object.entries(groupedData).map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        present: counts.present,
        absent: counts.absent,
      }));

      setWeeklyData(chartData);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  }

  const pieData = [
    { name: 'Present', value: stats.presentToday, color: '#388E3C' },
    { name: 'Absent', value: stats.absentToday, color: '#D32F2F' },
    { name: 'Late', value: stats.lateToday, color: '#FF9800' },
  ];

  const statCards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-[#0066CC]' },
    { title: 'Present Today', value: stats.presentToday, icon: UserCheck, color: 'bg-[#388E3C]' },
    { title: 'Absent Today', value: stats.absentToday, icon: UserX, color: 'bg-[#D32F2F]' },
    { title: 'Late Today', value: stats.lateToday, icon: Clock, color: 'bg-[#FF9800]' },
    { title: 'Pending Leaves', value: stats.pendingLeaves, icon: Calendar, color: 'bg-[#E31837]' },
  ];

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
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Real-time attendance overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-[#2E2E2E] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Weekly Attendance Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="#388E3C" name="Present" />
              <Bar dataKey="absent" fill="#D32F2F" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-[#2E2E2E] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Today's Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
