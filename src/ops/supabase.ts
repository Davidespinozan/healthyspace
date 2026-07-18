import { createClient } from '@supabase/supabase-js';

// Cliente para la app operativa (staff con login). storageKey aparte del member
// para que la sesión de staff no interfiera con el cliente anónimo del cliente.
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://ltveorvqvvlyivjwxjlc.supabase.co';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmVvcnZxdnZseWl2and4amxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODEzNTAsImV4cCI6MjA4Nzk1NzM1MH0.BpBc3lM6VpDyL5299H1MwQK0VBOBjKWQQconfpcCsfU';

export const opsSupabase = createClient(URL, ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hs-ops-auth' },
});

export type Role = 'pos' | 'admin' | 'almacen';
export interface Staff { id: string; name: string | null; role: Role; branch_id: string | null; active: boolean }
