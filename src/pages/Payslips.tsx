import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

type Payslip = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  gross: number;
  deductions: any;
  net: number;
  file_url: string | null;
};

export default function Payslips() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRows();
    const channel = supabase
      .channel('payslips-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payslips', filter: `user_id=eq.${user.id}` }, fetchRows)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  async function fetchRows() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      setRows((data as any) || []);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Payslips</h1>
        <p className="text-gray-600">View and download your payslips</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Period</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Gross</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">Net</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#2E2E2E]">File</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{format(new Date(r.period_start), 'MMM yyyy')}</td>
                <td className="px-4 py-3 text-sm">₹{r.gross.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">₹{r.net.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">
                  {r.file_url ? (
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="text-[#0066CC] hover:underline">Download</a>
                  ) : (
                    <span className="text-gray-500">Not available</span>
                  )}
                </td>
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


