import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Banknote } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';
import {
  resumen, porMetodo, porRemolque, porCanal, topPlatillos, porDia, variacionVsAyer,
  pedidosAtorados, ventasSinMetodo, cajasSinCerrar, arqueosConDiferencia,
  METODO_LABEL, money, type OrderRow, type CierreRow,
} from '../metrics';

/**
 * Centro de mando de administración.
 *
 * Regla que le copié a renovacell y es la que hace la diferencia: PRIMERO lo que
 * requiere acción, después los números. Un tablero que solo informa se deja de
 * ver a la semana; uno que dice "estos 3 pedidos llevan 25 min parados" se abre
 * todos los días.
 *
 * Solo lectura y agregando de lo que ya existe: no inventa datos nuevos.
 */
const hoyISO = () => new Date().toISOString().slice(0, 10);

export function Tablero({ staff }: { staff: Staff }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [cierres, setCierres] = useState<CierreRow[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [rango, setRango] = useState<'hoy' | '7d'>('hoy');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const desde = new Date(); desde.setDate(desde.getDate() - 8);
    let q = opsSupabase.from('truck_orders').select('*').gte('created_at', desde.toISOString());
    if (staff.role !== 'admin' && staff.branch_id) q = q.eq('branch', staff.branch_id);
    const [{ data: o }, { data: c }, { data: b }] = await Promise.all([
      q,
      opsSupabase.from('truck_cash_closings').select('branch,cerrado_en,diferencia,motivo')
        .gte('cerrado_en', desde.toISOString()),
      opsSupabase.from('truck_branches').select('id,name').eq('active', true),
    ]);
    setOrders((o as OrderRow[]) ?? []);
    setCierres((c as CierreRow[]) ?? []);
    setBranches((b as { id: string; name: string }[]) ?? []);
    setCargando(false);
  }, [staff.role, staff.branch_id]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return <Pad>Cargando…</Pad>;

  const delRango = rango === 'hoy'
    ? orders.filter((o) => o.created_at.slice(0, 10) === hoyISO())
    : orders;

  const r = resumen(delRango);
  const v = variacionVsAyer(orders);
  const nombreRem = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  // ── Pendientes ──
  const atorados = pedidosAtorados(orders, 20);
  const sinMetodo = ventasSinMetodo(delRango);
  const sinCerrar = cajasSinCerrar(orders, cierres, branches.map((b) => b.id));
  const arqueos = arqueosConDiferencia(cierres);
  const hayPendientes = atorados.length || sinMetodo.length || sinCerrar.length || arqueos.length;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '18px 16px 44px', display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="section-label">Centro de mando</div>
          <h2 className="h-1" style={{ fontSize: 22 }}>Administración</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['hoy', '7d'] as const).map((k) => (
            <button key={k} onClick={() => setRango(k)}
              style={{ padding: '7px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                background: rango === k ? 'var(--forest)' : 'transparent',
                color: rango === k ? 'var(--on-dark)' : 'var(--ink-2)',
                border: `1px solid ${rango === k ? 'var(--forest)' : 'var(--line)'}` }}>
              {k === 'hoy' ? 'Hoy' : '7 días'}
            </button>
          ))}
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={17} /></button>
        </div>
      </div>

      {/* ── LO QUE REQUIERE ACCIÓN — va primero, a propósito ── */}
      {hayPendientes ? (
        <div className="card" style={{ padding: 15, display: 'grid', gap: 11, border: '1px solid rgba(199,91,58,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--terra)' }}>
            <AlertTriangle size={17} /><b style={{ fontSize: 14 }}>Requiere tu atención</b>
          </div>
          {atorados.length > 0 && (
            <Pendiente titulo={`${atorados.length} pedido${atorados.length > 1 ? 's' : ''} sin avanzar`}
              detalle={atorados.slice(0, 3).map((o) => `${o.code} · ${o.min} min · ${nombreRem[o.branch ?? ''] ?? o.branch}`).join(' — ')} />
          )}
          {sinCerrar.length > 0 && (
            <Pendiente titulo="Caja sin cerrar"
              detalle={`${sinCerrar.map((b) => nombreRem[b] ?? b).join(', ')} — tuvieron ventas en efectivo hoy`} />
          )}
          {sinMetodo.length > 0 && (
            <Pendiente titulo={`${sinMetodo.length} venta${sinMetodo.length > 1 ? 's' : ''} sin método de pago`}
              detalle="Se cobraron en mostrador pero no se registró cómo — no van a cuadrar con caja" />
          )}
          {arqueos.length > 0 && (
            <Pendiente titulo={`${arqueos.length} arqueo${arqueos.length > 1 ? 's' : ''} con diferencia`}
              detalle={arqueos.slice(0, 3).map((c) => `${nombreRem[c.branch] ?? c.branch}: ${c.diferencia > 0 ? '+' : ''}${money(c.diferencia)}`).join(' — ')} />
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 14, fontSize: 13.5, color: 'var(--ink-2)' }}>
          Todo al corriente: sin pedidos atorados, cajas cerradas y arqueos cuadrados. 🌿
        </div>
      )}

      {/* ── Dato hero ── */}
      <div className="card dark-depth" style={{ padding: 18, background: 'var(--forest)', color: 'var(--on-dark)' }}>
        <div className="section-label" style={{ color: 'var(--amber)' }}>
          {rango === 'hoy' ? 'Ventas de hoy' : 'Ventas de 7 días'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
          <b className="tabular" style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.03em' }}>{money(r.total)}</b>
          {rango === 'hoy' && v.pct !== null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800,
              color: v.pct >= 0 ? '#8FCB9B' : '#E39B84' }}>
              {v.pct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {Math.abs(v.pct).toFixed(0)}% vs ayer
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12.5, color: 'var(--on-dark-2)' }}>
          <span><b style={{ color: 'var(--on-dark)' }}>{r.pedidos}</b> pedidos</span>
          <span>ticket <b style={{ color: 'var(--on-dark)' }}>{money(r.ticket)}</b></span>
          <span><b style={{ color: 'var(--on-dark)' }}>{r.articulos}</b> artículos</span>
        </div>
      </div>

      {/* ── Cómo pagaron ── */}
      <Bloque titulo="Cómo pagaron" icono={<Banknote size={15} />}>
        {porMetodo(delRango).map((m) => (
          <Barra key={m.metodo} label={METODO_LABEL[m.metodo] ?? m.metodo}
            valor={money(m.total)} nota={`${m.n} ped.`} pct={r.total ? (m.total / r.total) * 100 : 0}
            alerta={m.metodo === 'sin'} />
        ))}
      </Bloque>

      {/* ── Por remolque ── */}
      {staff.role === 'admin' && (
        <Bloque titulo="Por remolque">
          {porRemolque(delRango).map((b) => (
            <Barra key={b.branch} label={nombreRem[b.branch] ?? b.branch}
              valor={money(b.total)} nota={`${b.n} ped.`} pct={r.total ? (b.total / r.total) * 100 : 0} />
          ))}
        </Bloque>
      )}

      {/* ── De dónde vino ── */}
      <Bloque titulo="De dónde vino">
        {(() => { const c = porCanal(delRango); return (
          <>
            <Barra label="Mostrador" valor={money(c.mostrador.total)} nota={`${c.mostrador.pedidos} ped.`} pct={r.total ? (c.mostrador.total / r.total) * 100 : 0} />
            <Barra label="App" valor={money(c.app.total)} nota={`${c.app.pedidos} ped.`} pct={r.total ? (c.app.total / r.total) * 100 : 0} />
            {c.kiosko.pedidos > 0 && <Barra label="Kiosko" valor={money(c.kiosko.total)} nota={`${c.kiosko.pedidos} ped.`} pct={(c.kiosko.total / r.total) * 100} />}
          </>
        ); })()}
      </Bloque>

      {/* ── Lo más vendido ── */}
      <Bloque titulo="Lo más vendido">
        {topPlatillos(delRango).map((p) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0' }}>
            <b className="tabular" style={{ width: 30, fontSize: 15 }}>{p.qty}</b>
            <span style={{ flex: 1, fontSize: 13.5 }}>{p.name}</span>
            <span className="muted tabular" style={{ fontSize: 12.5 }}>{money(p.total)}</span>
          </div>
        ))}
        {topPlatillos(delRango).length === 0 && <Vacio />}
      </Bloque>

      {/* ── Tendencia ── */}
      <Bloque titulo="Últimos 7 días">
        {(() => {
          const d = porDia(orders, 7);
          const max = Math.max(...d.map((x) => x.total), 1);
          return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 92, paddingTop: 6 }}>
              {d.map((x) => (
                <div key={x.dia} style={{ flex: 1, display: 'grid', gap: 5, justifyItems: 'center' }}>
                  <div style={{ width: '100%', height: Math.max(3, (x.total / max) * 66), borderRadius: 5,
                    background: x.total ? 'var(--amber)' : 'var(--sand)' }} title={money(x.total)} />
                  <span className="muted" style={{ fontSize: 10 }}>
                    {new Date(x.dia + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </Bloque>
    </div>
  );
}

function Pendiente({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div style={{ paddingLeft: 25 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{titulo}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 1, lineHeight: 1.4 }}>{detalle}</div>
    </div>
  );
}

function Bloque({ titulo, icono, children }: { titulo: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 15 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icono}<b style={{ fontSize: 13.5 }}>{titulo}</b>
      </div>
      {children}
    </div>
  );
}

function Barra({ label, valor, nota, pct, alerta }: {
  label: string; valor: string; nota?: string; pct: number; alerta?: boolean;
}) {
  return (
    <div style={{ padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: alerta ? 800 : 500, color: alerta ? 'var(--terra)' : undefined }}>{label}</span>
        {nota && <span className="muted tabular" style={{ fontSize: 11.5 }}>{nota}</span>}
        <b className="tabular" style={{ fontSize: 14, minWidth: 74, textAlign: 'right' }}>{valor}</b>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--sand)', marginTop: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 3,
          background: alerta ? 'var(--terra)' : 'var(--amber)' }} />
      </div>
    </div>
  );
}

const Vacio = () => <p className="muted" style={{ fontSize: 13 }}>Todavía no hay ventas en este rango.</p>;
const Pad = ({ children }: { children: React.ReactNode }) =>
  <div style={{ padding: '18vh 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>{children}</div>;
