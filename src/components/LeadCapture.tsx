import { useState } from 'react';
import { Gift, Check, ArrowRight } from 'lucide-react';
import { useStore } from '../state/store';

/** Captación de leads (promos por WhatsApp), inspirada en el lead-bar de Anastacio.
 *  Guarda el lead en el store (falta backend). `variant="dark"` para fondos forest. */
export function LeadCapture({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const addLead = useStore((s) => s.addLead);
  const leadDone = useStore((s) => s.leadDone);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ok, setOk] = useState(false);

  const dark = variant === 'dark';
  const ready = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 8;
  const done = ok || leadDone;

  const submit = () => {
    if (!ready) return;
    addLead({ name: name.trim(), phone: phone.trim(), source: 'app' });
    setOk(true);
  };

  const ink = dark ? 'var(--on-dark)' : 'var(--ink)';
  const ink2 = dark ? 'var(--on-dark-2)' : 'var(--ink-2)';
  const field: React.CSSProperties = {
    width: '100%', padding: '13px 15px', borderRadius: 13, outline: 'none', fontSize: 14.5, fontWeight: 500,
    color: ink, background: dark ? 'rgba(0,0,0,.18)' : 'var(--cream)',
    boxShadow: dark ? 'inset 0 0 0 1.2px rgba(255,255,255,.12)' : 'inset 0 0 0 1.4px var(--sand)',
  };

  return (
    <div className={dark ? 'dark-depth' : ''} style={{
      borderRadius: 'var(--r-xl)', padding: '20px 18px',
      background: dark ? 'var(--forest)' : 'var(--cream-2)',
      boxShadow: dark ? 'var(--sh-lg), var(--edge-dark)' : 'var(--sh-sm), var(--edge)', color: ink,
    }}>
      {done ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 42, height: 42, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Check size={22} strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>¡Listo, quedaste dentro! 🎉</div>
            <div style={{ fontSize: 13, color: ink2, marginTop: 1 }}>Te mandamos promos y novedades por WhatsApp.</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Gift size={20} strokeWidth={2.2} color="var(--amber)" />
            <div style={{ fontWeight: 800, fontSize: 16 }}>Únete y recibe promos</div>
          </div>
          <p style={{ fontSize: 13, color: ink2, lineHeight: 1.45, marginBottom: 14 }}>
            Ofertas exclusivas y novedades directo a tu WhatsApp. Sin spam.
          </p>
          <div style={{ display: 'grid', gap: 9 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" style={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} placeholder="WhatsApp" type="tel" style={field} />
            <button className="btn btn--gold" onClick={submit} disabled={!ready} style={{ marginTop: 3 }}>
              Quiero promos <ArrowRight size={16} strokeWidth={2.6} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
