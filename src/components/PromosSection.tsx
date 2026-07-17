import { Ticket, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../state/store';
import { PROMOS, type Promo } from '../data/promos';

/** Promos del negocio (Culiacán). La app es local, así que se muestran a todos. */
export function PromosSection() {
  if (PROMOS.length === 0) return null;

  return (
    <section style={{ display: 'grid', gap: 15 }}>
      <div>
        <div className="section-label">Ofertas</div>
        <h2 className="h-1" style={{ fontSize: 21, marginTop: 3 }}>Promos de la semana</h2>
        <div className="section-line" />
      </div>
      <div className="hscroll" style={{ padding: '2px 0 4px' }}>
        {PROMOS.map((p) => <PromoCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

function PromoCard({ p }: { p: Promo }) {
  const setPromo = useStore((s) => s.setPromo);
  const showToast = useStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);

  const use = () => {
    if (!p.code) return;
    setPromo(p.code);
    try { navigator.clipboard?.writeText(p.code); } catch { /* noop */ }
    setCopied(true);
    showToast(`Código ${p.code} listo para tu pedido`);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{
      flex: '0 0 auto', width: 268, scrollSnapAlign: 'start', borderRadius: 'var(--r-xl)', overflow: 'hidden',
      color: 'var(--forest)', boxShadow: 'var(--glow-gold), var(--edge)',
      background: 'linear-gradient(150deg, var(--amber-l), var(--amber))',
    }}>
      <div style={{ padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: 'rgba(14,37,33,.12)', display: 'grid', placeItems: 'center' }}>
            <Ticket size={17} strokeWidth={2.2} color="var(--forest)" />
          </div>
          <span className="chip" style={{ background: 'var(--forest)', color: 'var(--amber-l)', fontWeight: 800, fontSize: 11 }}>{p.tag}</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15 }}>{p.title}</div>
        <p style={{ fontSize: 12.5, color: 'rgba(14,37,33,.72)', lineHeight: 1.45, margin: '6px 0 0' }}>{p.desc}</p>
      </div>
      {p.code && (
        <button onClick={use} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px', borderTop: '1px dashed rgba(14,37,33,.28)', background: 'var(--forest)',
          color: copied ? 'var(--amber-l)' : 'var(--on-dark)', fontWeight: 800, fontSize: 13,
        }}>
          {copied ? <><Check size={15} strokeWidth={3} /> ¡Código copiado!</> : <><Copy size={14} strokeWidth={2.4} /> Usar {p.code}</>}
        </button>
      )}
    </div>
  );
}
