import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  emp_id: string;
  department: string | null;
  joining_date: string | null;
  photo_url: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  manager_id?: string | null;
  mfa_enabled?: boolean;
  is_active: boolean;
};

export type Attendance = {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'present' | 'absent' | 'late' | 'onLeave';
  total_hours: number;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type Leave = {
  id: string;
  user_id: string;
  from_date: string;
  to_date: string;
  type: 'sick' | 'casual' | 'earned' | 'other';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_by: string | null;
  review_note: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  data: any;
  type: string | null;
  read: boolean;
  created_at: string;
};
