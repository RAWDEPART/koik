import React, { useEffect, useState } from 'react';
import { supabase, Leave, User } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function LeaveManagement() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<(Leave & { user: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchLeaves();

    const channel = supabase
      .channel('leaves-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
        fetchLeaves();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  async function fetchLeaves() {
    try {
      let base = supabase.from('leaves').select('*').order('applied_at', { ascending: false });
      if (filterStatus !== 'all') {
        base = base.eq('status', filterStatus);
      }
      const { data: leavesRows, error: leavesErr } = await base;
      if (leavesErr) throw leavesErr;

      const ids = Array.from(new Set((leavesRows || []).map((l: any) => l.user_id))).filter(Boolean);
      let usersById: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: usersRows, error: usersErr } = await supabase.from('users').select('*').in('id', ids as any);
        if (!usersErr && usersRows) {
          usersById = Object.fromEntries(usersRows.map((u: any) => [u.id, u]));
        }
      }

      const withUsers = (leavesRows || []).map((l: any) => ({ ...l, user: usersById[l.user_id] }));
      setLeaves(withUsers as any);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveAction(leaveId: string, action: 'approved' | 'rejected', note: string) {
    try {
      const { error } = await supabase
        .from('leaves')
        .update({
          status: action,
          reviewed_by: user?.id,
          review_note: note,
        })
        .eq('id', leaveId);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: leaves.find((l) => l.id === leaveId)?.user_id,
        title: `Leave ${action}`,
        message: `Your leave request has been ${action}. ${note}`,
        type: 'leave_status',
      });

      await supabase.from('audit_logs').insert({
        actor_user_id: user?.id,
        action: `LEAVE_${action.toUpperCase()}`,
        target: leaveId,
        meta: { note, timestamp: new Date().toISOString() },
      });

      alert(`Leave ${action} successfully!`);
      fetchLeaves();
    } catch (error: any) {
      alert('Error: ' + error.message);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Leave Management
          </h1>
          <p className="text-gray-600">Review and manage employee leave requests</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-64 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-4">
          {leaves.map((leave) => (
            <div key={leave.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#E31837] to-[#C4152E] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {leave.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2E2E2E]">{leave.user.name}</h3>
                    <p className="text-sm text-gray-600">{leave.user.emp_id}</p>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${
                    leave.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : leave.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {leave.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Leave Type</p>
                  <p className="font-medium text-[#2E2E2E] capitalize">{leave.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-medium text-[#2E2E2E]">
                    {format(new Date(leave.from_date), 'MMM dd')} - {format(new Date(leave.to_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Applied On</p>
                  <p className="font-medium text-[#2E2E2E]">
                    {format(new Date(leave.applied_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Days</p>
                  <p className="font-medium text-[#2E2E2E]">
                    {Math.ceil(
                      (new Date(leave.to_date).getTime() - new Date(leave.from_date).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1}{' '}
                    days
                  </p>
                </div>
              </div>

              {leave.reason && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Reason</p>
                  <p className="text-[#2E2E2E] bg-gray-50 p-3 rounded-lg">{leave.reason}</p>
                </div>
              )}

              {leave.review_note && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Review Note</p>
                  <p className="text-[#2E2E2E] bg-blue-50 p-3 rounded-lg">{leave.review_note}</p>
                </div>
              )}

              {leave.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const note = prompt('Add review note (optional):') || '';
                      handleLeaveAction(leave.id, 'approved', note);
                    }}
                    className="flex-1 py-3 px-6 bg-[#388E3C] hover:bg-green-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const note = prompt('Add rejection reason:');
                      if (note) handleLeaveAction(leave.id, 'rejected', note);
                    }}
                    className="flex-1 py-3 px-6 bg-[#D32F2F] hover:bg-red-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}

          {leaves.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No leave requests found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
