import { ChevronLeft, Minus, Plus, Clock, Apple, CreditCard, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import { ING } from '../data/menu';
import { BowlPhoto, money } from '../components/ui';

export default function Cart() {
  const pop = useStore((s) => s.pop);
  const reset = useStore((s) => s.reset);
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const placeOrder = useStore((s) => s.placeOrder);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  if (!cart.length) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 30 }}>
        <div>
          <h1 className="h-1">Tu pedido está vacío</h1>
          <p className="muted" style={{ margin: '10px 0 22px' }}>Arma tu bowl o elige uno signature.</p>
          <button className="btn" style={{ maxWidth: 240 }} onClick={() => reset({ name: 'menu' })}>Ver el menú</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(200px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 className="h-1" style={{ fontSize: 22 }}>Tu pedido</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 12 }}>
        {cart.map((c) => (
          <div key={c.key} className="card" style={{ display: 'flex', gap: 12, padding: 11, alignItems: 'center' }}>
            <div style={{ width: 66, height: 66, flex: '0 0 auto', borderRadius: 14, overflow: 'hidden' }}>
              <BowlPhoto src={c.img ?? ''} accent="#C79A5A" alt={c.name} radius={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{c.name}</div>
                <button onClick={() => removeFromCart(c.key)} style={{ color: 'var(--ink-3)' }} aria-label="quitar"><Trash2 size={16} /></button>
              </div>
              <div className="muted" style={{ fontSize: 12, margin: '3px 0 8px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.ingredients.map((id) => ING[id]?.name).filter(Boolean).join(' · ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--cream)', borderRadius: 999, padding: 3 }}>
                  <button className="iconbtn" style={{ boxShadow: 'none', width: 30, height: 30, background: 'transparent' }} onClick={() => setQty(c.key, c.qty - 1)}><Minus size={15} /></button>
                  <b className="tabular" style={{ minWidth: 16, textAlign: 'center' }}>{c.qty}</b>
                  <button className="iconbtn" style={{ boxShadow: 'none', width: 30, height: 30, background: 'transparent' }} onClick={() => setQty(c.key, c.qty + 1)}><Plus size={15} /></button>
                </div>
                <b className="tabular" style={{ marginLeft: 'auto', color: 'var(--amber-deep)' }}>{money(c.price * c.qty)}</b>
              </div>
            </div>
          </div>
        ))}

        {/* Pickup */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', boxShadow: 'var(--sh-sm)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(20,48,41,.06)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Clock size={19} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Recoger en el food truck</div>
            <div className="muted" style={{ fontSize: 13 }}>Listo en ~12 min · escaneas tu QR</div>
          </div>
        </div>
      </div>

      {/* Checkout fijo */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '16px 20px calc(16px + var(--safe-b))', background: 'var(--surface)', boxShadow: '0 -8px 30px -12px rgba(14,37,33,.2)',
        borderRadius: '26px 26px 0 0', display: 'grid', gap: 11, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span className="muted" style={{ flex: 1, fontSize: 14 }}>Total</span>
          <b className="tabular h-1" style={{ fontSize: 24 }}>{money(total)}</b>
        </div>
        <button className="btn" style={{ background: '#000' }} onClick={placeOrder}>
          <Apple size={18} strokeWidth={2.4} fill="currentColor" /> Pay
        </button>
        <div style={{ display: 'flex', gap: 11 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={placeOrder}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3-3A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4Z"/></svg>
            Google Pay
          </button>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={placeOrder}>
            <CreditCard size={18} strokeWidth={2.2} /> Tarjeta
          </button>
        </div>
      </div>
    </div>
  );
}
