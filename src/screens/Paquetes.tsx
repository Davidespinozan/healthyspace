import { useState } from 'react';
import { ChevronLeft, Check, Sparkles, Snowflake, Flame, ArrowRight } from 'lucide-react';
import { useStore } from '../state/store';
import { PACKAGES, perBowl, type WeeklyPackage } from '../data/menu';
import { pushReservation } from '../data/backend';
import { money } from '../components/ui';

export default function Paquetes() {
  const pop = useStore((s) => s.pop);
  const customer = useStore((s) => s.customer);
  const [size, setSize] = useState<number>(10);
  const [sealed, setSealed] = useState(true);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const pkg = PACKAGES.find((p) => p.size === size)!;
  const ready = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 8;

  const reservar = async () => {
    if (!ready) return;
    setSending(true);
    await pushReservation({ package: size, sealed, name: name.trim(), phone: phone.trim() });
    setSending(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="page dark-depth" style={{ minHeight: '100vh', background: 'var(--forest)', color: 'var(--on-dark)', display: 'grid', placeItems: 'center', padding: 30, textAlign: 'center' }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ width: 66, height: 66, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <Check size={32} strokeWidth={3} />
          </div>
          <h1 className="h-1" style={{ color: 'var(--on-dark)' }}>¡Semana reservada! 🌿</h1>
          <p style={{ color: 'var(--on-dark-2)', fontSize: 14.5, lineHeight: 1.5, margin: '12px 0 24px' }}>
            Apartaste tu paquete de <b style={{ color: 'var(--on-dark)' }}>{size} bowls</b>. Te contactamos por WhatsApp para
            arrancar tu primera semana. Es una reserva sin costo.
          </p>
          <button className="btn btn--gold" style={{ maxWidth: 240, margin: '0 auto' }} onClick={() => pop()}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(170px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Reserva tu semana</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 22 }}>
        {/* Pitch */}
        <div className="card dark-depth" style={{ background: 'var(--forest)', color: 'var(--on-dark)', padding: '18px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
          <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 8 }}>Meal prep · Healthy Space</div>
          <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>Tu semana de bowls, lista.</div>
          <p style={{ fontSize: 13.5, color: 'var(--on-dark-2)', lineHeight: 1.5, marginTop: 8 }}>
            Cocinamos en lote, porcionamos y sellamos al vacío. Tú solo recalientas — y si conectas tu Club,
            las macros se registran solas en tu plan. Más barato que pedir día con día.
          </p>
        </div>

        {/* Paquetes */}
        <section style={{ display: 'grid', gap: 11 }}>
          <div className="section-label">Elige tu paquete</div>
          {PACKAGES.map((p) => <PackageCard key={p.size} p={p} on={size === p.size} onClick={() => setSize(p.size)} />)}
        </section>

        {/* Presentación */}
        <section style={{ display: 'grid', gap: 11 }}>
          <div className="section-label">Presentación</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PresCard on={sealed} onClick={() => setSealed(true)} Icon={Snowflake} title="Sellado al vacío" sub="Para toda la semana" />
            <PresCard on={!sealed} onClick={() => setSealed(false)} Icon={Flame} title="Fresco" sub="Para los próximos días" />
          </div>
        </section>

        {/* Datos */}
        <section style={{ display: 'grid', gap: 10 }}>
          <div className="section-label">Tus datos</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" style={field} />
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} placeholder="WhatsApp" type="tel" style={field} />
        </section>

        <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, lineHeight: 1.4 }}>
          <Sparkles size={15} color="var(--amber-deep)" style={{ flex: '0 0 auto' }} />
          Es una reserva <b style={{ margin: '0 3px' }}>sin costo</b>. Estamos midiendo interés para arrancar los paquetes.
        </div>
      </div>

      {/* Reservar (fijo) */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '16px 20px calc(16px + var(--safe-b))', background: 'var(--surface)', boxShadow: '0 -10px 34px -14px rgba(14,37,33,.24), var(--edge)',
        borderRadius: '28px 28px 0 0', display: 'grid', gap: 4, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
          <span className="muted" style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{size} bowls · {sealed ? 'sellado' : 'fresco'}</span>
          <b className="tabular" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em' }}>{money(pkg.price)}</b>
        </div>
        <button className="btn" onClick={reservar} disabled={!ready || sending}>
          {sending ? 'Reservando…' : <>Reservar mi semana <ArrowRight size={17} strokeWidth={2.6} /></>}
        </button>
      </div>
    </div>
  );
}

function PackageCard({ p, on, onClick }: { p: WeeklyPackage; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderRadius: 18, textAlign: 'left',
      background: on ? 'var(--forest)' : 'var(--surface)', color: on ? 'var(--on-dark)' : 'var(--ink)',
      boxShadow: on ? 'var(--sh-md), var(--edge-dark)' : 'var(--sh-sm), var(--edge)', transition: 'background .2s, box-shadow .2s',
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 999, flex: '0 0 auto', display: 'grid', placeItems: 'center',
        background: on ? 'var(--amber)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1.6px var(--sand)' }}>
        {on && <Check size={13} strokeWidth={3} color="var(--forest)" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{p.size} bowls</span>
          <span className="chip" style={{ background: on ? 'rgba(191,160,101,.2)' : 'rgba(199,91,58,.12)', color: on ? 'var(--amber-l)' : 'var(--terra)', fontWeight: 800, fontSize: 11 }}>−{p.off}%</span>
        </div>
        <div style={{ fontSize: 12.5, color: on ? 'var(--on-dark-2)' : 'var(--ink-2)', marginTop: 2 }}>
          {money(perBowl(p))} por bowl · para la semana
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="tabular" style={{ fontWeight: 900, fontSize: 18 }}>{money(p.price)}</div>
        <div className="tabular" style={{ fontSize: 12, textDecoration: 'line-through', color: on ? 'var(--on-dark-3)' : 'var(--ink-3)' }}>{money(p.base)}</div>
      </div>
    </button>
  );
}

function PresCard({ on, onClick, Icon, title, sub }: { on: boolean; onClick: () => void; Icon: typeof Snowflake; title: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '14px 15px', borderRadius: 16,
      background: on ? 'var(--forest)' : 'var(--surface)', color: on ? 'var(--on-dark)' : 'var(--ink)',
      boxShadow: on ? 'var(--sh-md), var(--edge-dark)' : 'var(--sh-sm), var(--edge)', transition: 'background .2s, box-shadow .2s',
    }}>
      <Icon size={20} strokeWidth={2.1} color={on ? 'var(--amber-l)' : 'var(--ink-2)'} />
      <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 7 }}>{title}</div>
      <div style={{ fontSize: 12, color: on ? 'var(--on-dark-2)' : 'var(--ink-2)', marginTop: 1 }}>{sub}</div>
    </button>
  );
}

const field: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 14, background: 'var(--surface)',
  boxShadow: 'inset 0 0 0 1.4px var(--sand)', outline: 'none', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)',
};
