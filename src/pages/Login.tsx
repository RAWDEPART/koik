import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import logo from '../assets/finallogo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="PACE HR" className="w-16 h-16 rounded-xl object-contain mb-4 bg-white" />
            <h1 className="text-3xl font-bold text-[#2E2E2E] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Tech Mahindra
            </h1>
            <p className="text-gray-600 text-center">Employee Attendance Portal</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D32F2F] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#D32F2F]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2E2E2E] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-[#2E2E2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
                  placeholder="your.email@techmahindra.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2E2E2E] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-[#2E2E2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E31837] hover:bg-[#C4152E] text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* credentials removed for security */}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
        
        </p>
      </div>
    </div>
  );
}
