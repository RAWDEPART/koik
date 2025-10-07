import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, supabase } from '../lib/supabase';
import { signIn as authSignIn, signOut as authSignOut, getCurrentUser, getSession } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      await ensureDemoUsers();
    } catch (e) {
      // non-fatal inits
    } finally {
      await checkUser();
    }
  }

  async function ensureDemoUsers() {
    // Precomputed bcrypt hashes
    const ADMIN_EMAIL = 'admin@techmahindra.com';
    const ADMIN_HASH = '$2b$10$o4GSiQikCL4Unn5xdccpPuzFCVY5sYISHPDAmf1JqxpQMkdi3Fvsq'; // Admin123
    const EMP_EMAIL = '0404abhisheksaini@techmahindra.com';
    const EMP_HASH = '$2b$10$z0f.Di5.WhFjbn23XGP3pOrZ2L3oZ44jrW3QGY9bSxbySAx9k.Qui'; // TM182006TM

    await upsertUser(ADMIN_EMAIL, 'TechM Admin', 'admin', 'TM-ADMIN', ADMIN_HASH, 'HR');
    await upsertUser(EMP_EMAIL, 'Abhishek Saini', 'employee', 'TM-182006', EMP_HASH, 'Engineering');
  }

  async function upsertUser(
    email: string,
    name: string,
    role: 'admin' | 'employee',
    empId: string,
    passwordHash: string,
    department?: string
  ) {
    // Try email match
    let { data: existing, error } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    // Fallback: match by emp_id if email variant differs (e.g., 004 vs 0404 typo)
    if (!existing) {
      const fallback = await supabase.from('users').select('id').eq('emp_id', empId).maybeSingle();
      existing = fallback.data || null;
    }

    if (existing?.id) {
      await supabase
        .from('users')
        .update({ email, name, password_hash: passwordHash, role, is_active: true, emp_id: empId, department })
        .eq('id', existing.id);
      return;
    }

    await supabase.from('users').insert({
      email,
      name,
      role,
      emp_id: empId,
      password_hash: passwordHash,
      is_active: true,
      department: department || null,
    });
  }

  async function checkUser() {
    try {
      const session = getSession();
      if (session) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        // Fire and forget presence log for live tracking
        if (currentUser) {
          try {
            await supabase.from('presence_logs').insert({
              user_id: currentUser.id,
              page: window.location.pathname,
              user_agent: navigator.userAgent,
            });
            // Start heartbeat every 60s while tab visible
            startPresenceHeartbeat(currentUser.id);
          } catch {}
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Heartbeat timer management
  let heartbeatTimer: number | undefined;
  function startPresenceHeartbeat(userId: string) {
    stopPresenceHeartbeat();
    const tick = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await supabase.from('presence_logs').insert({ user_id: userId, page: window.location.pathname, user_agent: navigator.userAgent });
        } catch {}
      }
    };
    // immediate and then every 60s
    tick();
    heartbeatTimer = window.setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
  }
  function stopPresenceHeartbeat() {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  async function signIn(email: string, password: string) {
    const { user: authUser } = await authSignIn(email, password);
    setUser(authUser);
  }

  async function signOut() {
    await authSignOut();
    setUser(null);
  }

  async function refreshUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
