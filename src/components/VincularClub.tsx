import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../data/supabase';
import { Logo } from './Logo';

/**
 * Conectar el pedido con la cuenta de Healthy Space Club.
 *
 * Las dos apps comparten el MISMO proyecto de Supabase, así que "vincular" es
 * literalmente iniciar sesión con la cuenta del Club: es la misma `auth.users`.
 * No hay que inventar tokens ni pasar el id del usuario por la URL (eso dejaría
 * que cualquiera se hiciera pasar por otro escribiendo el link a mano).
 *
 * El gancho no es "vincula tu cuenta" —eso le sirve al negocio, no a ella— sino
 * que sus pedidos se registren solos en su plan y no vuelva a capturar nada.
 *
 * Pedir sin cuenta sigue siendo lo normal: esto es opcional y se puede cerrar.
 */
export function VincularClub({ onCerrar, onVinculado }: {
  onCerrar: () => void;
  onVinculado: (userId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesión (volvió a entrar), no se pregunta de nuevo.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) onVinculado(data.user.id); });
  }, [onVinculado]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pass || cargando) return;
    setError(null);
    setCargando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    setCargando(false);
    if (error || !data.user) {
      setError('No pudimos entrar con esos datos. Revisa tu correo y contraseña.');
      return;
    }
    onVinculado(data.user.id);
  }

  return (
    <div className="vc-bg" onClick={onCerrar}>
      <div className="vc" onClick={(e) => e.stopPropagation()}>
        <button className="vc-x" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        <Logo size={40} variant="h" />
        <h3>¿Eres del Club?</h3>
        <p>
          Conecta tu cuenta y <b>tus pedidos se registran solos en tu plan</b>.
          No vuelves a capturar nada a mano.
        </p>
        <form onSubmit={entrar}>
          <input type="email" inputMode="email" autoComplete="email" placeholder="Tu correo del Club"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" autoComplete="current-password" placeholder="Contraseña"
            value={pass} onChange={(e) => setPass(e.target.value)} />
          {error && <p className="vc-err">{error}</p>}
          <button type="submit" className="btn btn--gold" disabled={!email || !pass || cargando}>
            {cargando ? 'Conectando…' : 'Conectar mi cuenta'}
          </button>
        </form>
        <button className="vc-no" onClick={onCerrar}>Pedir sin cuenta</button>
      </div>
    </div>
  );
}
