import { useCallback, useEffect, useState } from 'react';
import { opsSupabase, type Staff } from './supabase';

/** Sesión de staff: carga el registro truck_staff (rol + sucursal) del usuario. */
export function useOpsAuth() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff | null>(null);
  // Un tropiezo al leer truck_staff no es lo mismo que "no eres del personal".
  // Antes los dos casos acababan en staff = null, que rebota a la pantalla de
  // login sin decir nada: parece que te expulsó el sistema.
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await opsSupabase.auth.getUser();
      if (!user) { setStaff(null); setError(null); return; }
      const { data, error } = await opsSupabase.from('truck_staff').select('*').eq('id', user.id).maybeSingle();
      if (error) { setError(error.message); return; }
      setError(null);
      setStaff((data as Staff) ?? null);
    } catch (e) {
      // Sin conexión, `getUser()` lanza. Antes esto dejaba la app en "Cargando…"
      // para siempre porque setLoading(false) no estaba en un finally.
      setError(e instanceof Error ? e.message : 'No se pudo conectar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = opsSupabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const signIn = (email: string, password: string) =>
    opsSupabase.auth.signInWithPassword({ email: email.trim(), password });
  const signOut = () => opsSupabase.auth.signOut();

  return { loading, staff, error, signIn, signOut, recargar: load };
}
