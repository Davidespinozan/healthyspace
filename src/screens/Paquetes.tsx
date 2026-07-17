import { ChevronLeft, Users, Snowflake, Store, Bike, ArrowRight, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { PACKAGES, type WeeklyPackage } from '../data/menu';

export default function Paquetes() {
  const pop = useStore((s) => s.pop);
  const goTab = useStore((s) => s.goTab);

  return (
    <div className="page" style={{ paddingBottom: 'calc(110px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Paquetes</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 22 }}>
        {/* Pitch */}
        <div className="card dark-depth" style={{ background: 'var(--forest)', color: 'var(--on-dark)', padding: '20px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
          <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 8 }}>Pide en grande, paga menos</div>
          <div style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.2 }}>5 o 10 bowls con descuento.</div>
          <p style={{ fontSize: 13.5, color: 'var(--on-dark-2)', lineHeight: 1.5, marginTop: 8 }}>
            Para compartir en la oficina o en familia, o para armar tu semana. Tú eliges los bowls que quieras —
            el descuento se aplica solo al llegar a 5 o 10.
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--on-dark-2)' }}><Store size={15} color="var(--amber-l)" /> Recoge</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--on-dark-2)' }}><Bike size={15} color="var(--amber-l)" /> o a domicilio</span>
          </div>
        </div>

        {/* Tiers */}
        <section style={{ display: 'grid', gap: 11 }}>
          <div className="section-label">El descuento</div>
          {PACKAGES.map((p) => <Tier key={p.size} p={p} />)}
        </section>

        {/* Meal prep */}
        <div className="card" style={{ display: 'flex', gap: 12, padding: '15px 16px', alignItems: 'center', boxShadow: 'var(--sh-sm), var(--edge)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--cream-2)', color: 'var(--amber-deep)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Snowflake size={20} strokeWidth={2.1} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>¿Es para tu semana?</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 1 }}>Pídelos sellados al vacío al pagar (meal prep). Para compartir, van frescos.</div>
          </div>
        </div>
      </div>

      {/* CTA fijo */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '14px 20px calc(16px + var(--safe-b))', background: 'linear-gradient(transparent, var(--cream) 24%)', zIndex: 20 }}>
        <button className="btn" onClick={() => goTab('menu')}>
          <Users size={18} strokeWidth={2.3} /> Elegir mis bowls <ArrowRight size={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

function Tier({ p }: { p: WeeklyPackage }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', boxShadow: 'var(--sh-sm), var(--edge)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--forest)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontWeight: 900, fontSize: 16 }}>{p.size}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{p.size} bowls o más</span>
          <span className="chip" style={{ background: 'rgba(78,122,69,.14)', color: '#3F6B39', fontWeight: 800, fontSize: 11 }}><Check size={12} strokeWidth={3} /> −{p.off}%</span>
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Descuento sobre el total de tus bowls</div>
      </div>
    </div>
  );
}
