import { Copy, Check } from 'lucide-react';
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
      position: 'relative', color: 'var(--on-dark)', boxShadow: 'var(--sh-md), var(--edge-dark)', background: 'var(--forest)',
    }}>
      {/* Foto de fondo + degradado */}
      <img src={p.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,26,22,.30), rgba(8,26,22,.55) 55%, rgba(8,26,22,.9))' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ padding: '15px 16px 14px', minHeight: 128, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: 'auto' }}>{p.tag}</span>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.15, marginTop: 10 }}>{p.title}</div>
          <p style={{ fontSize: 12.5, color: 'var(--on-dark-2)', lineHeight: 1.45, margin: '5px 0 0' }}>{p.desc}</p>
        </div>
        {p.code && (
          <button onClick={use} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', borderTop: '1px dashed rgba(244,241,233,.22)', background: 'rgba(0,0,0,.28)',
            color: copied ? 'var(--amber-l)' : 'var(--on-dark)', fontWeight: 800, fontSize: 13, backdropFilter: 'blur(4px)',
          }}>
            {copied ? <><Check size={15} strokeWidth={3} /> ¡Código copiado!</> : <><Copy size={14} strokeWidth={2.4} /> Usar {p.code}</>}
          </button>
        )}
      </div>
    </div>
  );
}
