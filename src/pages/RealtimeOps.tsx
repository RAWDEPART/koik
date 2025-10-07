import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type AvgRow = { date: string; avg_in_time: string; avg_out_time: string; records: number };
type Buckets = { before_9: number; between_9_930: number; between_930_10: number; between_10_11: number; after_11: number };

export default function RealtimeOps() {
  const [avgRows, setAvgRows] = useState<AvgRow[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [buckets, setBuckets] = useState<Buckets | null>(null);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('realtime-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence_logs' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchAll() {
    const [avgRes, onlineRes, bucketRes] = await Promise.all([
      supabase.from('daily_average_in_out').select('*').order('date', { ascending: false }).limit(14),
      supabase.from('online_users_now').select('*'),
      supabase.from('today_in_time_buckets').select('*').maybeSingle(),
    ]);
    setAvgRows((avgRes.data as any) || []);
    setOnlineCount((onlineRes.data as any)?.length || 0);
    setBuckets((bucketRes.data as any) || null);
  }

  const avgChart = avgRows
    .slice()
    .reverse()
    .map((r) => ({ date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), in: timeToNum(r.avg_in_time), out: timeToNum(r.avg_out_time) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Realtime Operations</h1>
        <p className="text-gray-600">Live presence, averages, and in-time distribution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Online Now</p>
          <p className="text-4xl font-bold text-[#2E2E2E]">{onlineCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Today Check-ins</p>
          <p className="text-4xl font-bold text-[#2E2E2E]">{(buckets?.before_9 || 0) + (buckets?.between_9_930 || 0) + (buckets?.between_930_10 || 0) + (buckets?.between_10_11 || 0) + (buckets?.after_11 || 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <p className="text-gray-600 text-sm">Late Arrivals (≥ 09:30)</p>
          <p className="text-4xl font-bold text-[#2E2E2E]">{(buckets?.between_930_10 || 0) + (buckets?.between_10_11 || 0) + (buckets?.after_11 || 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-4">Average In/Out Time (last 14 days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={avgChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 24]} tickFormatter={(v) => numToTime(v)} />
            <Tooltip formatter={(v: any) => numToTime(v as number)} />
            <Bar dataKey="in" name="Avg In" fill="#388E3C" />
            <Bar dataKey="out" name="Avg Out" fill="#0066CC" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-4">Today's In-Time Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {buckets && (
            <>
              <Bucket label="Before 9:00" value={buckets.before_9} />
              <Bucket label="09:00–09:30" value={buckets.between_9_930} />
              <Bucket label="09:30–10:00" value={buckets.between_930_10} />
              <Bucket label="10:00–11:00" value={buckets.between_10_11} />
              <Bucket label="After 11:00" value={buckets.after_11} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function timeToNum(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return h + m / 60;
}
function numToTime(val: number): string {
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Bucket({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl text-center">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-[#2E2E2E]">{value}</p>
    </div>
  );
}


