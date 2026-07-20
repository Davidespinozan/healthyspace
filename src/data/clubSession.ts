import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Sesión del socio del Club dentro de la app del food truck.
 *
 * Las dos apps comparten el mismo proyecto de Supabase, así que la "vinculación"
 * es la sesión: si hay usuario, está vinculado. Este hook es la única fuente de
 * verdad para toda la app — antes cada pantalla adivinaba por su cuenta y por eso
 * el perfil seguía diciendo "Invitado" con la cuenta ya conectada.
 */
export interface ClubSession {
  userId: string | null;
  nombre: string | null;
  email: string | null;
  cargando: boolean;
}

export function useClubSession(): ClubSession & { desvincular: () => Promise<void> } {
  const [s, setS] = useState<ClubSession>({ userId: null, nombre: null, email: null, cargando: true });

  useEffect(() => {
    let vivo = true;

    async function leer(userId: string | null, email: string | null) {
      if (!userId) { if (vivo) setS({ userId: null, nombre: null, email: null, cargando: false }); return; }
      // El nombre vive en el perfil del Club. Si no se puede leer, el correo sirve
      // igual — nunca dejar al socio como "Invitado" teniendo sesión.
      const { data } = await supabase
        .from('user_profiles').select('display_name').eq('user_id', userId).maybeSingle();
      if (vivo) setS({ userId, nombre: (data?.display_name as string) ?? null, email, cargando: false });
    }

    void supabase.auth.getUser().then(({ data }) => leer(data.user?.id ?? null, data.user?.email ?? null));
    // Reacciona a entrar/salir sin recargar la app.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, ses) =>
      leer(ses?.user?.id ?? null, ses?.user?.email ?? null));

    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  const desvincular = async () => {
    await supabase.auth.signOut();
    setS({ userId: null, nombre: null, email: null, cargando: false });
  };

  return { ...s, desvincular };
}

/** Primer nombre, para saludar sin sonar a formulario. */
export const primerNombre = (n: string | null, email: string | null): string =>
  (n?.trim().split(/\s+/)[0]) || (email?.split('@')[0]) || 'socio';
