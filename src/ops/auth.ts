import { useCallback, useEffect, useState } from 'react';
import { opsSupabase, type Staff } from './supabase';

/** Sesión de staff: carga el registro truck_staff (rol + sucursal) del usuario. */
export function useOpsAuth() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await opsSupabase.auth.getUser();
    if (!user) { setStaff(null); setLoading(false); return; }
    const { data } = await opsSupabase.from('truck_staff').select('*').eq('id', user.id).maybeSingle();
    setStaff((data as Staff) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = opsSupabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const signIn = (email: string, password: string) =>
    opsSupabase.auth.signInWithPassword({ email: email.trim(), password });
  const signOut = () => opsSupabase.auth.signOut();

  return { loading, staff, signIn, signOut };
}
