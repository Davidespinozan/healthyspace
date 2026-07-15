import { ChevronLeft, Store, Bike, Check, Apple, CreditCard, ShieldCheck } from 'lucide-react';
import { useStore, type OrderMode } from '../state/store';
import { DELIVERY_FEE } from '../data/menu';
import { money } from '../components/ui';

export default function Checkout() {
  const pop = useStore((s) => s.pop);
  const cart = useStore((s) => s.cart);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const address = useStore((s) => s.address);
  const setAddress = useStore((s) => s.setAddress);
  const customer = useStore((s) => s.customer);
  const setCustomer = useStore((s) => s.setCustomer);
  const placeOrder = useStore((s) => s.placeOrder);

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const fee = mode === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + fee;

  const canDeliver = mode !== 'delivery' || address.trim().length > 4;
  const ready = customer.name.trim().length > 1 && customer.phone.trim().length >= 8 && canDeliver;

  return (
    <div className="page" style={{ paddingBottom: 'calc(240px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Checkout</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 24 }}>
        {/* Método de entrega */}
        <section style={{ display: 'grid', gap: 12 }}>
          <div className="section-label">Método de entrega</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModeCard m="pickup" on={mode === 'pickup'} onClick={() => setMode('pickup')}
              Icon={Store} title="Pickup" sub="Recoge en el truck · 12 min" note="Gratis" />
            <ModeCard m="delivery" on={mode === 'delivery'} onClick={() => setMode('delivery')}
              Icon={Bike} title="Entrega" sub="A tu ubicación · 30 min" note={money(DELIVERY_FEE)} />
          </div>
        </section>

        {/* Dirección (solo delivery) */}
        {mode === 'delivery' && (
          <section style={{ display: 'grid', gap: 10 }}>
            <div className="section-label">Dirección de entrega</div>
            <Field value={address} onChange={setAddress} placeholder="Calle, número, colonia, referencias" multiline />
          </section>
        )}

        {/* Datos */}
        <section style={{ display: 'grid', gap: 10 }}>
          <div className="section-label">Tus datos</div>
          <Field value={customer.name} onChange={(v) => setCustomer({ name: v })} placeholder="Nombre" />
          <Field value={customer.phone} onChange={(v) => setCustomer({ phone: v.replace(/[^\d ]/g, '') })} placeholder="Teléfono" type="tel" />
          <Field value={customer.notes} onChange={(v) => setCustomer({ notes: v })} placeholder="Notas del pedido (opcional)" />
        </section>

        {/* Resumen */}
        <section style={{ display: 'grid', gap: 8 }}>
          <div className="section-label">Resumen</div>
          <div className="card" style={{ padding: '15px 16px', display: 'grid', gap: 8, boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <Row label="Subtotal" value={money(subtotal)} />
            <Row label={mode === 'delivery' ? 'Envío' : 'Pickup'} value={mode === 'delivery' ? money(fee) : 'Gratis'} muted={mode !== 'delivery'} />
            <hr className="hair" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Total</span>
              <b className="tabular" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em' }}>{money(total)}</b>
            </div>
          </div>
        </section>
      </div>

      {/* Pago (fijo) */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '16px 20px calc(16px + var(--safe-b))', background: 'var(--surface)', boxShadow: '0 -10px 34px -14px rgba(14,37,33,.24), var(--edge)',
        borderRadius: '28px 28px 0 0', display: 'grid', gap: 10, zIndex: 20 }}>
        <button className="btn" style={{ background: ready ? '#000' : undefined }} onClick={placeOrder} disabled={!ready}>
          <Apple size={18} strokeWidth={2.4} fill="currentColor" /> Pay · {money(total)}
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={placeOrder} disabled={!ready}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3-3A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4Z"/></svg>
            Google Pay
          </button>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={placeOrder} disabled={!ready}>
            <CreditCard size={18} strokeWidth={2.2} /> Tarjeta
          </button>
        </div>
        <div className="muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, marginTop: 2 }}>
          <ShieldCheck size={14} /> Pago 100% seguro
        </div>
      </div>
    </div>
  );
}

function ModeCard({ on, onClick, Icon, title, sub, note }: {
  m: OrderMode; on: boolean; onClick: () => void; Icon: typeof Store; title: string; sub: string; note: string;
}) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '15px 15px', borderRadius: 18, position: 'relative',
      background: on ? 'var(--forest)' : 'var(--surface)', color: on ? 'var(--on-dark)' : 'var(--ink)',
      boxShadow: on ? 'var(--sh-md), var(--edge-dark)' : 'var(--sh-sm), var(--edge)',
      transition: 'background .2s, box-shadow .2s, transform .12s var(--ease)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={22} strokeWidth={2.1} color={on ? 'var(--amber-l)' : 'var(--ink)'} />
        {on && <span style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: 999, background: 'var(--amber)', display: 'grid', placeItems: 'center' }}><Check size={13} strokeWidth={3} color="var(--forest)" /></span>}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
      <div style={{ fontSize: 12, color: on ? 'var(--on-dark-2)' : 'var(--ink-2)', marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
      <div className="tabular" style={{ fontSize: 12.5, fontWeight: 800, marginTop: 7, color: on ? 'var(--amber-l)' : 'var(--amber-deep)' }}>{note}</div>
    </button>
  );
}

function Field({ value, onChange, placeholder, type = 'text', multiline }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string; multiline?: boolean;
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 14, background: 'var(--surface)',
    boxShadow: 'inset 0 0 0 1.4px var(--sand)', outline: 'none', fontSize: 14.5, fontWeight: 500, color: 'var(--ink)',
  };
  return multiline ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...base, resize: 'none' }} />
  ) : (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} style={base} />
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 13.5 }}>
      <span className="muted" style={{ flex: 1, fontWeight: 600 }}>{label}</span>
      <span className="tabular" style={{ fontWeight: 700, color: muted ? 'var(--ink-2)' : 'var(--ink)' }}>{value}</span>
    </div>
  );
}
