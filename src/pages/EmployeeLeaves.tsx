import React, { useEffect, useState } from 'react';
import { supabase, Leave } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [balances, setBalances] = useState<{ casual: number; sick: number; earned: number } | null>(null);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchLeaves();
      fetchMeta();

      const channel = supabase
        .channel('my-leaves')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leaves',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchLeaves();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  async function fetchLeaves() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMeta() {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const [balRes, holRes] = await Promise.all([
      supabase.from('leave_balances').select('casual,sick,earned').eq('user_id', user.id).maybeSingle(),
      supabase.from('holidays').select('date,name').gte('date', todayStr).order('date', { ascending: true }),
    ]);
    if (balRes.data) setBalances(balRes.data as any);
    if (holRes.data) setHolidays(holRes.data as any);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
  const approvedLeaves = leaves.filter((l) => l.status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            My Leaves
          </h1>
          <p className="text-gray-600">Apply for leave and track your leave history</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-[#E31837] hover:bg-[#C4152E] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{pendingLeaves}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{approvedLeaves}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm">Total Requests</p>
          <p className="text-3xl font-bold text-[#2E2E2E]">{leaves.length}</p>
        </div>
      </div>

      {balances && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg"><p className="text-gray-600 text-sm">Casual Balance</p><p className="text-3xl font-bold text-[#2E2E2E]">{balances.casual}</p></div>
          <div className="bg-white rounded-2xl p-6 shadow-lg"><p className="text-gray-600 text-sm">Sick Balance</p><p className="text-3xl font-bold text-[#2E2E2E]">{balances.sick}</p></div>
          <div className="bg-white rounded-2xl p-6 shadow-lg"><p className="text-gray-600 text-sm">Earned Balance</p><p className="text-3xl font-bold text-[#2E2E2E]">{balances.earned}</p></div>
        </div>
      )}

      {holidays.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-[#2E2E2E] mb-4">Upcoming Holidays</h2>
          <ul className="list-disc pl-6 space-y-1">
            {holidays.map((h) => (
              <li key={h.date} className="text-sm text-gray-700">{format(new Date(h.date), 'MMM dd, yyyy')} - {h.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-6">Leave History</h2>

        <div className="space-y-4">
          {leaves.map((leave) => (
            <div key={leave.id} className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#2E2E2E] capitalize">{leave.type} Leave</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(leave.from_date), 'MMM dd')} - {format(new Date(leave.to_date), 'MMM dd, yyyy')}
                  </p>
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

              {leave.reason && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Reason</p>
                  <p className="text-[#2E2E2E] bg-gray-50 p-3 rounded-lg">{leave.reason}</p>
                </div>
              )}

              {leave.review_note && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Review Note</p>
                  <p className="text-[#2E2E2E] bg-blue-50 p-3 rounded-lg">{leave.review_note}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600 pt-3 border-t border-gray-200">
                <span>
                  Applied: {format(new Date(leave.applied_at), 'MMM dd, yyyy')}
                </span>
                <span>
                  Duration:{' '}
                  {Math.ceil(
                    (new Date(leave.to_date).getTime() - new Date(leave.from_date).getTime()) / (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  days
                </span>
              </div>
            </div>
          ))}

          {leaves.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No leave requests yet</p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mt-4 text-[#E31837] hover:text-[#C4152E] font-medium"
              >
                Apply for your first leave
              </button>
            </div>
          )}
        </div>
      </div>

      {showApplyModal && <ApplyLeaveModal onClose={() => setShowApplyModal(false)} onSuccess={fetchLeaves} />}
    </div>
  );
}

function ApplyLeaveModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'casual',
    from_date: '',
    to_date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (new Date(formData.from_date) > new Date(formData.to_date)) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('leaves').insert({
        user_id: user?.id,
        ...formData,
        status: 'pending',
        applied_at: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user?.id,
        title: 'Leave Application Submitted',
        message: `Your ${formData.type} leave request has been submitted for approval.`,
        type: 'leave_submitted',
      });

      alert('Leave application submitted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-[#2E2E2E] mb-6">Apply for Leave</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Leave Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">From Date</label>
            <input
              type="date"
              required
              value={formData.from_date}
              onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">To Date</label>
            <input
              type="date"
              required
              value={formData.to_date}
              onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Reason</label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              placeholder="Please provide a reason for your leave request..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[#E31837] hover:bg-[#C4152E] text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
