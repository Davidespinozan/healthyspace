import { ChevronLeft, Minus, Plus, Trash2, Tag, ArrowRight } from 'lucide-react';
import { useStore, cartTotals } from '../state/store';
import { ING, DRINKS, EXTRAS } from '../data/menu';
import { BowlPhoto, money } from '../components/ui';
import { ProductRail } from '../components/ProductRail';

export default function Cart() {
  const pop = useStore((s) => s.pop);
  const push = useStore((s) => s.push);
  const goTab = useStore((s) => s.goTab);
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const mode = useStore((s) => s.mode);
  const promo = useStore((s) => s.promo);
  const setPromo = useStore((s) => s.setPromo);

  const t = cartTotals(cart, mode);

  if (!cart.length) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 30 }}>
        <div>
          <h1 className="h-1">Tu pedido está vacío</h1>
          <p className="muted" style={{ margin: '10px 0 22px' }}>Arma tu bowl o elige uno signature.</p>
          <button className="btn" style={{ maxWidth: 240 }} onClick={() => goTab('menu')}>Ver el menú</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(220px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Mi pedido</h1>
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
                <b className="price" style={{ marginLeft: 'auto' }}>{money(c.price * c.qty)}</b>
              </div>
            </div>
          </div>
        ))}

        {/* Upsell: bebidas */}
        <section style={{ marginTop: 6 }}>
          <div className="section-label" style={{ marginBottom: 11 }}>Agrégale una bebida 🥤</div>
          <ProductRail products={DRINKS} />
        </section>

        {/* Upsell: extras */}
        <section>
          <div className="section-label" style={{ marginBottom: 11 }}>¿Algo extra?</div>
          <ProductRail products={EXTRAS} />
        </section>

        {/* Código promocional */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 14px', boxShadow: 'var(--sh-sm), var(--edge)' }}>
          <Tag size={17} strokeWidth={2.2} color="var(--amber-deep)" />
          <input
            value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="¿Tienes un código?"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, letterSpacing: '.02em' }}
          />
          <button className="chip" style={{ background: 'var(--forest)', color: 'var(--on-dark)', opacity: promo ? 1 : .4 }} disabled={!promo}>Aplicar</button>
        </div>
      </div>

      {/* Resumen + continuar (fijo) */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '18px 20px calc(16px + var(--safe-b))', background: 'var(--surface)', boxShadow: '0 -10px 34px -14px rgba(14,37,33,.24), var(--edge)',
        borderRadius: '28px 28px 0 0', display: 'grid', gap: 9, zIndex: 20 }}>
        {(() => {
          const need = t.bowls > 0 && t.bowls < 5 ? 5 - t.bowls : t.bowls >= 5 && t.bowls < 10 ? 10 - t.bowls : 0;
          const nextPct = t.bowls < 5 ? 12 : 19;
          return need > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(191,160,101,.14)', color: 'var(--amber-deep)', padding: '9px 12px', borderRadius: 11, fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>
              🌿 Agrega {need} bowl{need > 1 ? 's' : ''} más y ahorra {nextPct}%
            </div>
          ) : null;
        })()}
        <Row label="Subtotal" value={money(t.subtotal)} />
        {t.discount > 0 && (
          <Row label={`Paquete ${t.bowls} bowls · −${Math.round(t.pct * 100)}%`} value={`−${money(t.discount)}`} accent />
        )}
        <Row label={mode === 'delivery' ? 'Envío a domicilio' : 'Recoger en el truck'} value={mode === 'delivery' ? money(t.fee) : 'Gratis'} muted={mode !== 'delivery'} />
        <hr className="hair" style={{ margin: '3px 0' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Total</span>
          <b className="tabular" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em' }}>{money(t.total)}</b>
        </div>
        <button className="btn" onClick={() => push({ name: 'checkout' })}>
          Continuar al pago <ArrowRight size={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  const color = accent ? '#3F6B39' : muted ? 'var(--ink-2)' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 13.5 }}>
      <span style={{ flex: 1, fontWeight: accent ? 700 : 600, color: accent ? '#3F6B39' : 'var(--ink-2)' }}>{label}</span>
      <span className="tabular" style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
