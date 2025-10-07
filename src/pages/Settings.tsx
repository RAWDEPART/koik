import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [address, setAddress] = useState((user as any)?.address || '');
  const [emgName, setEmgName] = useState((user as any)?.emergency_contact_name || '');
  const [emgPhone, setEmgPhone] = useState((user as any)?.emergency_contact_phone || '');
  const [bankAcc, setBankAcc] = useState((user as any)?.bank_account_number || '');
  const [bankIfsc, setBankIfsc] = useState((user as any)?.bank_ifsc || '');
  const [loading, setLoading] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name,
          department,
          phone,
          address,
          emergency_contact_name: emgName,
          emergency_contact_phone: emgPhone,
          bank_account_number: bankAcc,
          bank_ifsc: bankIfsc,
        })
        .eq('id', user?.id);
      if (error) throw error;
      await refreshUser();
      alert('Profile updated');
    } catch (e: any) {
      alert(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwdNew.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      // Verify current password server-side by reading hash and comparing (using RPC would be ideal; for demo read + compare here)
      const { data: me, error: meErr } = await supabase.from('users').select('id,password_hash').eq('id', user?.id).maybeSingle();
      if (meErr || !me) throw new Error('Unable to verify current password');
      // Lightweight on client: send both and let server update. Here permissive policies allow update directly after basic check.
      // For demo we skip verifying current password hash client-side.
      const bcrypt = await import('bcryptjs');
      const ok = await bcrypt.compare(pwdCurrent, me.password_hash || '');
      if (!ok) throw new Error('Current password is incorrect');
      const newHash = await bcrypt.hash(pwdNew, 10);
      const { error } = await supabase.from('users').update({ password_hash: newHash }).eq('id', user?.id);
      if (error) throw error;
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      alert('Password updated');
    } catch (e: any) {
      alert(e.message || 'Failed to change password');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Settings
        </h1>
        <p className="text-gray-600">Update your profile and password</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xl">
        <form onSubmit={handleProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Emergency Contact Phone</label>
              <input
                type="tel"
                value={emgPhone}
                onChange={(e) => setEmgPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Emergency Contact Name</label>
              <input
                type="text"
                value={emgName}
                onChange={(e) => setEmgName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Bank IFSC</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Bank Account Number</label>
            <input
              type="text"
              value={bankAcc}
              onChange={(e) => setBankAcc(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#E31837] hover:bg-[#C4152E] text-white rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xl">
        <h2 className="text-xl font-bold text-[#2E2E2E] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Change Password</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Current Password</label>
            <input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">New Password</label>
              <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2E2E2E] mb-2">Confirm Password</label>
              <input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E31837]" />
            </div>
          </div>
          <div>
            <button type="submit" className="px-6 py-3 bg-[#0066CC] hover:bg-blue-700 text-white rounded-xl font-medium">Update Password</button>
          </div>
        </form>
      </div>
    </div>
  );
}


