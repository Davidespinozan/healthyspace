import { useCallback, useEffect, useState } from 'react';
import { Bike, Store, Clock, ArrowRight, RefreshCw, Snowflake } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';

interface OrderRow {
  id: string; code: string; mode: 'pickup' | 'delivery';
  items: { name: string; qty: number }[]; total: number; branch: string | null;
  address: string | null; sealed: boolean; customer: { name?: string; phone?: string; notes?: string } | null;
  status: string; created_at: string;
}

const FLOW: Record<'pickup' | 'delivery', string[]> = {
  pickup: ['recibido', 'preparando', 'listo', 'recogido'],
  delivery: ['recibido', 'preparando', 'camino', 'entregado'],
};
const LABEL: Record<string, string> = {
  recibido: 'Recibido', preparando: 'Preparando', listo: 'Listo', camino: 'Salió a domicilio',
  recogido: 'Recogido', entregado: 'Entregado',
};
const NEXT_LABEL: Record<string, string> = {
  recibido: 'Empezar a preparar', preparando: 'Marcar listo', listo: 'Marcar recogido',
  camino: 'Marcar entregado',
};

export function PosOrders({ staff }: { staff: Staff }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    let q = opsSupabase.from('truck_orders').select('*').order('created_at', { ascending: false }).limit(60);
    if (staff.role !== 'admin' && staff.branch_id) q = q.eq('branch', staff.branch_id);
    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }, [staff.role, staff.branch_id]);

  useEffect(() => {
    fetchOrders();
    const ch = opsSupabase.channel('pos-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_orders' }, () => fetchOrders())
      .subscribe();
    return () => { opsSupabase.removeChannel(ch); };
  }, [fetchOrders]);

  const advance = async (o: OrderRow) => {
    const flow = FLOW[o.mode];
    const next = flow[Math.min(flow.indexOf(o.status) + 1, flow.length - 1)];
    setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status: next } : x))); // optimista
    await opsSupabase.from('truck_orders').update({ status: next }).eq('id', o.id);
  };

  const done = (s: string) => s === 'recogido' || s === 'entregado';
  const active = orders.filter((o) => !done(o.status));
  const finished = orders.filter((o) => done(o.status)).slice(0, 8);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="section-label">Pedidos en vivo</div>
          <h2 className="h-1" style={{ fontSize: 22 }}>{active.length} activo{active.length !== 1 ? 's' : ''}</h2>
        </div>
        <button className="iconbtn" onClick={fetchOrders} aria-label="Actualizar"><RefreshCw size={18} /></button>
      </div>

      {loading ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Cargando…</div>
      ) : active.length === 0 ? (
        <div className="muted" style={{ padding: '14vh 20px', textAlign: 'center' }}>No hay pedidos activos. Los nuevos aparecen aquí solos. 🌿</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {active.map((o) => <Card key={o.id} o={o} onAdvance={advance} />)}
        </div>
      )}

      {finished.length > 0 && (
        <>
          <div className="section-label" style={{ margin: '26px 0 12px' }}>Completados hoy</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {finished.map((o) => (
              <div key={o.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', opacity: .7 }}>
                <b className="tabular">{o.code}</b>
                <span className="muted" style={{ fontSize: 13, flex: 1 }}>{o.items.reduce((n, i) => n + i.qty, 0)} art. · {LABEL[o.status]}</span>
                <b className="price">${o.total}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ o, onAdvance }: { o: OrderRow; onAdvance: (o: OrderRow) => void }) {
  const isDelivery = o.mode === 'delivery';
  const mins = Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000);
  return (
    <div className="card" style={{ padding: 15, display: 'grid', gap: 11, boxShadow: 'var(--sh-md), var(--edge)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isDelivery ? <Bike size={17} color="var(--terra)" /> : <Store size={17} color="var(--amber-deep)" />}
        <b className="tabular" style={{ fontSize: 16 }}>{o.code}</b>
        {o.sealed && <Snowflake size={14} color="var(--amber-deep)" />}
        <span className="muted tabular" style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {mins}m</span>
      </div>

      <div style={{ display: 'grid', gap: 3 }}>
        {o.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', fontSize: 13.5 }}>
            <b className="tabular" style={{ width: 26 }}>{it.qty}×</b>
            <span style={{ flex: 1 }}>{it.name}</span>
          </div>
        ))}
      </div>

      {(o.customer?.name || o.address) && (
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.4, borderTop: '1px solid var(--sand)', paddingTop: 8 }}>
          {o.customer?.name && <div><b style={{ color: 'var(--ink)' }}>{o.customer.name}</b> · {o.customer.phone}</div>}
          {isDelivery && o.address && <div>{o.address}</div>}
          {o.customer?.notes && <div style={{ color: 'var(--terra)' }}>“{o.customer.notes}”</div>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="chip" style={{ background: 'rgba(191,160,101,.16)', color: 'var(--amber-deep)', fontWeight: 800 }}>{LABEL[o.status]}</span>
        <b className="price" style={{ marginLeft: 'auto' }}>${o.total}</b>
      </div>

      {NEXT_LABEL[o.status] && (
        <button className="btn" onClick={() => onAdvance(o)} style={{ padding: '12px 16px' }}>
          {NEXT_LABEL[o.status]} <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
