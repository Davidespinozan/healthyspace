import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Clock, ChefHat, PackageCheck, PartyPopper, Bike, MapPin, X, MessageCircle } from 'lucide-react';
import { useStore, flowFor, type OrderStatus } from '../state/store';
import { Logo } from '../components/Logo';
import { money } from '../components/ui';

const LABELS: Record<OrderStatus, { label: string; sub: string; Icon: typeof Check }> = {
  recibido:  { label: 'Pedido recibido', sub: 'Ya lo tenemos', Icon: Check },
  preparando:{ label: 'Preparando', sub: 'Lo armamos fresco', Icon: ChefHat },
  listo:     { label: 'Listo para recoger', sub: 'Escanea tu QR en el truck', Icon: PackageCheck },
  camino:    { label: 'En camino', sub: 'Tu repartidor va para allá', Icon: Bike },
  recogido:  { label: 'Recogido', sub: '¡Buen provecho!', Icon: PartyPopper },
  entregado: { label: 'Entregado', sub: '¡Buen provecho!', Icon: PartyPopper },
};

export default function Order() {
  const order = useStore((s) => s.order);
  const advanceOrder = useStore((s) => s.advanceOrder);
  const reset = useStore((s) => s.reset);
  const [qr, setQr] = useState('');

  const isDelivery = order?.mode === 'delivery';

  useEffect(() => {
    if (!order || isDelivery) return;
    QRCode.toDataURL(`HSPACE:${order.code}`, { margin: 1, width: 460, color: { dark: '#0E2521', light: '#00000000' } })
      .then(setQr).catch(() => setQr(''));
  }, [order?.code, isDelivery]);

  // Avance simulado (demo).
  useEffect(() => {
    if (!order) return;
    const flow = flowFor(order.mode);
    if (order.status === flow[flow.length - 1] || order.status === flow[flow.length - 2]) return;
    const t = setTimeout(advanceOrder, order.status === 'recibido' ? 3200 : 5200);
    return () => clearTimeout(t);
  }, [order?.status]);

  if (!order) return null;
  const flow = flowFor(order.mode);
  const steps = flow.map((id) => ({ id, ...LABELS[id] }));
  const activeIdx = flow.indexOf(order.status);
  const ready = !isDelivery && (order.status === 'listo' || order.status === 'recogido');

  return (
    <div className="page dark-depth" style={{ minHeight: '100vh', background: 'var(--forest)', color: 'var(--on-dark)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: 'calc(14px + var(--safe-t)) 20px 8px', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center', flex: '0 0 auto', overflow: 'hidden' }}>
          <Logo size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>Pedido {order.code}</div>
          <div style={{ fontSize: 13, color: 'var(--on-dark-2)', marginTop: 2 }}>
            {order.items.reduce((n, i) => n + i.qty, 0)} artículo(s) · {money(order.total)}
          </div>
        </div>
        <button className="iconbtn" onClick={() => reset({ name: 'home' })}
          style={{ background: 'rgba(255,255,255,.1)', color: 'var(--on-dark)' }} aria-label="cerrar"><X size={20} /></button>
      </div>

      {/* QR (pickup) o tarjeta de dirección (delivery) */}
      {isDelivery ? (
        <div style={{ padding: '16px 20px 4px' }}>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 22, padding: 18, display: 'flex', gap: 13, alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <MapPin size={20} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Entrega a domicilio</div>
              <div style={{ fontSize: 12.5, color: 'var(--on-dark-2)', marginTop: 2 }}>{order.address || 'Tu dirección'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, color: 'var(--amber)', justifyContent: 'center' }}>
            <Clock size={15} /> <b className="tabular" style={{ fontSize: 13.5 }}>Llega en ~{order.etaMin} min</b>
          </div>
        </div>
      ) : (
        <div style={{ padding: '18px 20px 4px', display: 'grid', placeItems: 'center' }}>
          <div style={{
            background: ready ? 'var(--cream)' : 'rgba(244,241,233,.10)', borderRadius: 26, padding: 22,
            display: 'grid', placeItems: 'center', gap: 14, width: '100%', maxWidth: 320,
            transition: 'background .5s var(--ease)', boxShadow: ready ? '0 0 0 3px var(--amber), var(--sh-xl)' : 'none',
          }}>
            <div style={{ width: 200, height: 200, display: 'grid', placeItems: 'center', filter: ready ? 'none' : 'opacity(.5)' }}>
              {qr && <img src={qr} alt={`QR ${order.code}`} style={{ width: '100%', height: '100%' }} />}
            </div>
            <div style={{ textAlign: 'center', color: ready ? 'var(--forest)' : 'var(--on-dark-2)' }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{ready ? 'Muéstralo en el food truck' : 'Tu QR se activa cuando esté listo'}</div>
              <div className="tabular" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.04em', marginTop: 4 }}>{order.code}</div>
            </div>
          </div>
          {!ready && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, color: 'var(--amber)' }}>
              <Clock size={15} /> <b className="tabular" style={{ fontSize: 13.5 }}>Listo en ~{order.etaMin} min</b>
            </div>
          )}
        </div>
      )}

      {/* Stepper */}
      <div style={{ padding: '22px 24px 24px' }}>
        {steps.map((s, i) => {
          const done = i < activeIdx, active = i === activeIdx, on = done || active;
          const last = i === steps.length - 1;
          return (
            <div key={s.id} style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', justifyItems: 'center' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 999, flex: '0 0 auto', display: 'grid', placeItems: 'center',
                  background: on ? 'var(--amber)' : 'rgba(255,255,255,.09)', color: on ? 'var(--forest)' : 'var(--on-dark-2)',
                  boxShadow: active ? '0 0 0 5px rgba(191,160,101,.22)' : 'none', transition: 'all .4s var(--ease)',
                }}>
                  <s.Icon size={18} strokeWidth={2.4} />
                </div>
                {!last && <div style={{ width: 2, height: 30, background: done ? 'var(--amber)' : 'rgba(255,255,255,.12)', transition: 'background .4s' }} />}
              </div>
              <div style={{ paddingTop: 7, paddingBottom: 14, opacity: on ? 1 : .5 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: 'var(--on-dark-2)', marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 20px calc(28px + var(--safe-b))', display: 'grid', gap: 10 }}>
        <button className="btn btn--ghost" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--on-dark)', boxShadow: 'none' }}>
          <MessageCircle size={17} strokeWidth={2.2} /> ¿Necesitas ayuda? Escríbenos
        </button>
        <button className="btn btn--ghost" style={{ background: 'transparent', color: 'var(--on-dark-2)', boxShadow: 'none' }}
          onClick={() => reset({ name: 'home' })}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
