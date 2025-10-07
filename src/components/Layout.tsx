import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Clock,
  Calendar,
  Users,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
} from 'lucide-react';
import logo from '../assets/finallogo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      if (!user) return;
      const { data } = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/notifications?select=count&id=neq.null&user_id=eq.${user.id}&read=eq.false`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      }).then((r) => r.json()).catch(() => []);
      const count = Array.isArray(data) ? data.length : 0;
      setUnread(count);
    }
    fetchUnread();
  }, [user, location.pathname]);

  const adminNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Leaves', path: '/leaves', icon: Calendar },
    { name: 'Directory', path: '/directory', icon: Users },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Documents', path: '/documents', icon: FileText },
    { name: 'Realtime', path: '/realtime', icon: FileText },
    { name: 'Shifts', path: '/shifts', icon: Clock },
    { name: 'Regularizations', path: '/regularizations', icon: Clock },
    { name: 'Expenses', path: '/expenses', icon: FileText },
    { name: 'Help Desk', path: '/helpdesk', icon: FileText },
    { name: 'Goals', path: '/goals', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const employeeNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Attendance', path: '/my-attendance', icon: Clock },
    { name: 'My Leaves', path: '/my-leaves', icon: Calendar },
    { name: 'Payslips', path: '/payslips', icon: FileText },
    { name: 'Shifts', path: '/shifts', icon: Clock },
    { name: 'Regularizations', path: '/regularizations', icon: Clock },
    { name: 'Expenses', path: '/expenses', icon: FileText },
    { name: 'Help Desk', path: '/helpdesk', icon: FileText },
    { name: 'Goals', path: '/goals', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const navigation = user?.role === 'admin' ? adminNav : employeeNav;

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F4F4] to-white">
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-3">
              <img src={logo} alt="PACE HR" className="w-10 h-10 rounded-lg object-contain bg-white" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  PACE HR
                </h1>
                <p className="text-xs text-gray-600">Employee Self Service</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5 text-gray-700" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#E31837] text-white text-[10px] rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-[#2E2E2E]">{user?.name}</p>
                <p className="text-xs text-gray-600">{user?.emp_id} • {user?.department || '—'}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-[#E31837] to-[#C4152E] rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-[#E31837]"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:transform-none z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#E31837] text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="lg:ml-64 pt-16">
        <main className="p-6">{children}</main>
        <footer className="px-6 py-8 text-xs text-gray-500">
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between flex-wrap gap-2">
            <div>© {new Date().getFullYear()} Tech Mahindra Ltd. All Rights Reserved.</div>
            <div className="space-x-3">
              <a className="hover:underline" href="#">Privacy Policy</a>
              <a className="hover:underline" href="#">Terms of Use</a>
              <a className="hover:underline" href="#">Contact HR</a>
              <a className="hover:underline" href="#">IT Support</a>
            </div>
          </div>
        </footer>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
