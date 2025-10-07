import { supabase, User } from './supabase';
import bcrypt from 'bcryptjs';

export async function signIn(email: string, password: string): Promise<{ user: User; session: any }> {
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  if (fetchError || !users) {
    throw new Error('Invalid credentials');
  }

  const passwordHash = (users as any).password_hash as string | undefined;
  if (!passwordHash) {
    throw new Error('Account misconfigured');
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const session = {
    user: {
      id: users.id,
      email: users.email,
      role: users.role,
    },
    access_token: btoa(JSON.stringify({ userId: users.id, role: users.role, exp: Date.now() + 15 * 60 * 1000 })),
    refresh_token: btoa(JSON.stringify({ userId: users.id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })),
  };

  localStorage.setItem('session', JSON.stringify(session));

  return { user: users as User, session };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('session');
}

export function getSession(): any | null {
  const sessionStr = localStorage.getItem('session');
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    const payload = JSON.parse(atob(session.access_token));

    if (payload.exp < Date.now()) {
      localStorage.removeItem('session');
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = getSession();
  if (!session) return null;

  const payload = JSON.parse(atob(session.access_token));

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .maybeSingle();

  if (error || !user) return null;

  return user as User;
}
