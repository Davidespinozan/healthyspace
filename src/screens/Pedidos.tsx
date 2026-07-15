import { ClipboardList, ChevronRight, RotateCcw, Store, Bike } from 'lucide-react';
import { useStore, flowFor, type Order } from '../state/store';
import { money } from '../components/ui';

const STATUS_TEXT: Record<string, string> = {
  recibido: 'Recibido', preparando: 'Preparando', listo: 'Listo', camino: 'En camino',
  recogido: 'Recogido', entregado: 'Entregado',
};

export default function Pedidos() {
  const orders = useStore((s) => s.orders);
  const push = useStore((s) => s.push);
  const goTab = useStore((s) => s.goTab);
  const addToCart = useStore((s) => s.addToCart);

  const openOrder = (o: Order) => { useStore.setState({ order: o }); push({ name: 'order' }); };
  const reorder = (o: Order) => {
    o.items.forEach((it) => addToCart({ bowlId: it.bowlId, name: it.name, ingredients: it.ingredients, price: it.price, img: it.img }, it.qty));
    push({ name: 'cart' });
  };

  return (
    <div className="page has-tabs">
      <div className="topbar" style={{ display: 'block' }}>
        <div className="section-label">Tu historial</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', marginTop: 2 }}>Pedidos</h1>
      </div>

      {orders.length === 0 ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '18vh 30px', textAlign: 'center', gap: 6 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', marginBottom: 8 }}>
            <ClipboardList size={28} strokeWidth={1.8} color="var(--ink-3)" />
          </div>
          <h2 className="h-2">Aún no tienes pedidos</h2>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 240 }}>Cuando ordenes, aquí verás el estado y tu historial.</p>
          <button className="btn" style={{ maxWidth: 220, marginTop: 12 }} onClick={() => goTab('menu')}>Ver el menú</button>
        </div>
      ) : (
        <div style={{ padding: '4px 20px', display: 'grid', gap: 14 }}>
          {orders.map((o) => {
            const flow = flowFor(o.mode);
            const active = o.status !== flow[flow.length - 1];
            const Mode = o.mode === 'delivery' ? Bike : Store;
            return (
              <div key={o.code} className="card" style={{ padding: 15, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mode size={18} strokeWidth={2.1} color="var(--ink-2)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{o.code}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{o.items.reduce((n, i) => n + i.qty, 0)} artículo(s) · {o.mode === 'delivery' ? 'Entrega' : 'Pickup'}</div>
                  </div>
                  <span className="chip" style={{
                    background: active ? 'rgba(191,160,101,.16)' : 'rgba(20,48,41,.05)',
                    color: active ? 'var(--amber-deep)' : 'var(--ink-2)', fontWeight: 700,
                  }}>{STATUS_TEXT[o.status]}</span>
                </div>

                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
                </div>

                <hr className="hair" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <b className="tabular" style={{ fontSize: 17, fontWeight: 900, flex: 1 }}>{money(o.total)}</b>
                  {active ? (
                    <button className="chip" style={{ background: 'var(--forest)', color: 'var(--on-dark)' }} onClick={() => openOrder(o)}>
                      Ver estado <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button className="chip" onClick={() => reorder(o)}>
                      <RotateCcw size={14} /> Repetir
                    </button>
                  )}
                </div>
                {/* Detalle de líneas */}
                <div style={{ display: 'grid', gap: 4 }}>
                  {o.items.map((it) => (
                    <div key={it.key} style={{ display: 'flex', fontSize: 12.5 }}>
                      <span style={{ flex: 1, color: 'var(--ink-2)' }}>{it.qty}× {it.name}</span>
                      <span className="tabular" style={{ fontWeight: 600 }}>{money(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
