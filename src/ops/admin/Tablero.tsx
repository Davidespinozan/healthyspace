import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Banknote, Store, Sparkles, BarChart3 } from 'lucide-react';
import { OpsHead, Card, Barra } from '../OpsShell';
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
    <>
      <OpsHead kicker="Centro de mando" titulo="Administración"
        sub={rango === 'hoy' ? 'Movimiento de hoy' : 'Últimos 7 días'}>
        <div className="ops-seg">
          {(['hoy', '7d'] as const).map((k) => (
            <button key={k} className={rango === k ? 'on' : ''} onClick={() => setRango(k)}>
              {k === 'hoy' ? 'Hoy' : '7 días'}
            </button>
          ))}
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </OpsHead>

      {/* Los pendientes van ARRIBA del dato de ventas, a propósito: un tablero que
          solo informa se deja de ver; uno que dice qué hacer se abre a diario. */}
      {hayPendientes ? (
        <div className="ops-pend">
          <div className="ops-pend-t"><AlertTriangle size={16} /> Requiere tu atención</div>
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
              detalle="Se cobraron en mostrador sin registrar cómo — no van a cuadrar con caja" />
          )}
          {arqueos.length > 0 && (
            <Pendiente titulo={`${arqueos.length} arqueo${arqueos.length > 1 ? 's' : ''} con diferencia`}
              detalle={arqueos.slice(0, 3).map((c) => `${nombreRem[c.branch] ?? c.branch}: ${c.diferencia > 0 ? '+' : ''}${money(c.diferencia)}`).join(' — ')} />
          )}
        </div>
      ) : (
        <div className="ops-ok">Todo al corriente: sin pedidos atorados, cajas cerradas y arqueos cuadrados.</div>
      )}

      <div className="ops-hero">
        <div className="ops-kicker">{rango === 'hoy' ? 'Ventas de hoy' : 'Ventas de 7 días'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div className="ops-hero-v">{money(r.total)}</div>
          {rango === 'hoy' && v.pct !== null && (
            <span className={`ops-delta ${v.pct >= 0 ? 'up' : 'down'}`}>
              {v.pct >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {Math.abs(v.pct).toFixed(0)}% vs ayer
            </span>
          )}
        </div>
        <div className="ops-hero-row">
          <span><b>{r.pedidos}</b> pedidos</span>
          <span>ticket <b>{money(r.ticket)}</b></span>
          <span><b>{r.articulos}</b> artículos</span>
        </div>
      </div>

      <Card titulo="Cómo pagaron" icono={<Banknote size={15} />}>
        {porMetodo(delRango).length === 0 && <p className="ops-empty">Sin ventas en este rango.</p>}
        {porMetodo(delRango).map((m) => (
          <Barra key={m.metodo} label={METODO_LABEL[m.metodo] ?? m.metodo}
            valor={money(m.total)} nota={`${m.n} ped.`}
            pct={r.total ? (m.total / r.total) * 100 : 0} alerta={m.metodo === 'sin'} />
        ))}
      </Card>

      {staff.role === 'admin' && (
        <Card titulo="Por remolque" icono={<Store size={15} />}>
          {porRemolque(delRango).length === 0 && <p className="ops-empty">Sin ventas en este rango.</p>}
          {porRemolque(delRango).map((b) => (
            <Barra key={b.branch} label={nombreRem[b.branch] ?? b.branch}
              valor={money(b.total)} nota={`${b.n} ped.`} pct={r.total ? (b.total / r.total) * 100 : 0} />
          ))}
        </Card>
      )}

      <Card titulo="De dónde vino" icono={<Sparkles size={15} />}>
        {(() => { const c = porCanal(delRango); return (
          <>
            <Barra label="Mostrador" valor={money(c.mostrador.total)} nota={`${c.mostrador.pedidos} ped.`} pct={r.total ? (c.mostrador.total / r.total) * 100 : 0} />
            <Barra label="App del cliente" valor={money(c.app.total)} nota={`${c.app.pedidos} ped.`} pct={r.total ? (c.app.total / r.total) * 100 : 0} />
            {c.kiosko.pedidos > 0 && <Barra label="Kiosko" valor={money(c.kiosko.total)} nota={`${c.kiosko.pedidos} ped.`} pct={(c.kiosko.total / r.total) * 100} />}
          </>
        ); })()}
      </Card>

      <Card titulo="Lo más vendido">
        {topPlatillos(delRango).length === 0 && <p className="ops-empty">Todavía no hay ventas en este rango.</p>}
        {topPlatillos(delRango).map((p) => (
          <div key={p.name} className="ops-row">
            <b className="ops-row-q">{p.qty}</b>
            <span className="ops-row-l">{p.name}</span>
            <span className="ops-row-v">{money(p.total)}</span>
          </div>
        ))}
      </Card>

      <Card titulo="Últimos 7 días" icono={<BarChart3 size={15} />}>
        {(() => {
          const d = porDia(orders, 7);
          const max = Math.max(...d.map((x) => x.total), 1);
          return (
            <div className="ops-chart">
              {d.map((x) => (
                <div key={x.dia} className="ops-chart-col">
                  <div className={`ops-chart-bar${x.total ? '' : ' cero'}`}
                    style={{ height: Math.max(3, (x.total / max) * 68) }} title={money(x.total)} />
                  <span className="ops-chart-d">
                    {new Date(x.dia + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>
    </>
  );
}

function Pendiente({ titulo, detalle }: { titulo: string; detalle: string }) {
  return <div className="ops-pend-item"><b>{titulo}</b><p>{detalle}</p></div>;
}



const Pad = ({ children }: { children: React.ReactNode }) => <div className="ops-center">{children}</div>;
