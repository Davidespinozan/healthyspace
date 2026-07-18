import { useState } from 'react';
import { LogIn, Lock } from 'lucide-react';
import { Logo } from '../components/Logo';

export function Login({ onSignIn }: { onSignIn: (e: string, p: string) => Promise<{ error: unknown }> }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setBusy(true);
    const { error } = await onSignIn(email, pass);
    setBusy(false);
    if (error) setErr('Correo o contraseña incorrectos.');
  };

  return (
    <div className="dark-depth" style={{ minHeight: '100vh', background: 'var(--forest)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <Logo size={64} />
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--amber-l)' }}>Operaciones</div>
            <h1 className="h-1" style={{ color: 'var(--on-dark)', marginTop: 4 }}>Healthy Space</h1>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 11 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" autoCapitalize="none" style={field} />
          <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Contraseña" type="password" style={field} />
          {err && <div style={{ color: '#F2A98F', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}><Lock size={14} /> {err}</div>}
          <button className="btn btn--gold" onClick={submit} disabled={busy || !email || !pass} style={{ marginTop: 4 }}>
            {busy ? 'Entrando…' : <><LogIn size={17} strokeWidth={2.4} /> Entrar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const field: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 14, outline: 'none', fontSize: 15, fontWeight: 500,
  color: 'var(--on-dark)', background: 'rgba(0,0,0,.2)', boxShadow: 'inset 0 0 0 1.2px rgba(255,255,255,.14)',
};
