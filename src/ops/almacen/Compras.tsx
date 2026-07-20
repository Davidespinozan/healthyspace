import { useCallback, useEffect, useState } from 'react';
import { Truck, Plus, X, Check, RefreshCw } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Compras: la entrada de mercancía y del COSTO.
 *
 * Cada compra recibida recalcula el costo promedio ponderado del insumo. Es lo
 * que evita que el costeo se vuelva ficción: un costo tecleado a mano se queda
 * viejo en un mes y a partir de ahí todos los márgenes mienten.
 *
 * Se usa promedio ponderado y no "último precio" porque el último precio hace
 * saltar el costo de todos los platillos por una compra chica de emergencia.
 */
const money = (n: number) => '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });

interface Compra {
  id: string; folio: string; proveedor: string | null; ubicacion: string;
  items: { insumo: string; cantidad: number; costo_unitario: number }[];
  total: number; estado: 'pendiente' | 'recibida' | 'cancelada'; pagada: boolean;
  created_at: string;
}
interface Insumo { id: string; nombre: string; unidad: string; costo_unitario: number | null }
interface Prov { id: string; nombre: string }
interface Ubic { id: string; nombre: string }

export function Compras({ staff }: { staff: Staff }) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [provs, setProvs] = useState<Prov[]>([]);
  const [ubic, setUbic] = useState<Ubic[]>([]);
  const [nueva, setNueva] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: c }, { data: i }, { data: p }, { data: u }] = await Promise.all([
      opsSupabase.from('truck_compras').select('*').order('created_at', { ascending: false }).limit(25),
      opsSupabase.from('truck_insumos').select('id,nombre,unidad,costo_unitario').eq('activo', true).order('nombre'),
      opsSupabase.from('truck_proveedores').select('id,nombre').eq('activo', true),
      opsSupabase.from('truck_ubicaciones').select('id,nombre').eq('activa', true).order('orden'),
    ]);
    setCompras((c as Compra[]) ?? []);
    setInsumos((i as Insumo[]) ?? []);
    setProvs((p as Prov[]) ?? []);
    setUbic((u as Ubic[]) ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const nomI = Object.fromEntries(insumos.map((i) => [i.id, i]));
  const nomU = Object.fromEntries(ubic.map((u) => [u.id, u.nombre]));
  const nomP = Object.fromEntries(provs.map((p) => [p.id, p.nombre]));

  async function recibir(c: Compra) {
    setError(null);
    const { error } = await opsSupabase.rpc('recibir_compra', { p_id: c.id });
    if (error) { setError(error.message); return; }
    void cargar();
  }

  if (cargando) return <div className="ops-center">Cargando compras…</div>;

  const pendientes = compras.filter((c) => c.estado === 'pendiente');
  const recibidas = compras.filter((c) => c.estado === 'recibida').slice(0, 10);

  return (
    <>
      <OpsHead kicker="Entradas y costos" titulo="Compras"
        sub="Al recibir, el costo del insumo se recalcula con promedio ponderado.">
        <div className="ops-seg">
          <button className="on" onClick={() => setNueva(true)}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Nueva</button>
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </OpsHead>

      {error && <div className="ops-pend"><div className="ops-pend-t">{error}</div></div>}

      <Card titulo={`Por recibir (${pendientes.length})`} icono={<Truck size={15} />}>
        {pendientes.length === 0 && <p className="ops-empty">Nada por recibir.</p>}
        {pendientes.map((c) => (
          <div key={c.id} className="ops-row" style={{ alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13.5 }}>{nomP[c.proveedor ?? ''] ?? 'Sin proveedor'}</b>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {c.items.map((i) => `${i.cantidad} ${nomI[i.insumo]?.unidad ?? ''} ${nomI[i.insumo]?.nombre ?? i.insumo}`).join(' · ')}
                {' → '}{nomU[c.ubicacion] ?? c.ubicacion}
              </p>
            </div>
            <b style={{ fontSize: 13.5, minWidth: 76, textAlign: 'right' }}>{money(c.total)}</b>
            <button className="btn" style={{ padding: '8px 14px', fontSize: 12.5 }}
              onClick={() => recibir(c)}>Recibir</button>
          </div>
        ))}
      </Card>

      {recibidas.length > 0 && (
        <Card titulo="Recibidas">
          {recibidas.map((c) => (
            <div key={c.id} className="ops-row">
              <span className="ops-row-l">
                {nomP[c.proveedor ?? ''] ?? 'Sin proveedor'}
                <span className="ops-bar-n" style={{ marginLeft: 7 }}>
                  {new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </span>
              </span>
              <span className="ops-row-v">{c.items.length} insumo{c.items.length > 1 ? 's' : ''}</span>
              <b style={{ minWidth: 78, textAlign: 'right', fontSize: 13.5 }}>{money(c.total)}</b>
            </div>
          ))}
        </Card>
      )}

      {nueva && (
        <SheetNueva staff={staff} insumos={insumos} provs={provs} ubic={ubic}
          onCerrar={() => setNueva(false)} onListo={() => { setNueva(false); void cargar(); }} />
      )}
    </>
  );
}

function SheetNueva({ staff, insumos, provs, ubic, onCerrar, onListo }: {
  staff: Staff; insumos: Insumo[]; provs: Prov[]; ubic: Ubic[];
  onCerrar: () => void; onListo: () => void;
}) {
  const [proveedor, setProveedor] = useState(provs[0]?.id ?? '');
  const [ubicacion, setUbicacion] = useState('almacen');
  const [items, setItems] = useState<Record<string, { cantidad: string; costo: string }>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filas = Object.entries(items)
    .filter(([, v]) => Number(v.cantidad) > 0 && Number(v.costo) > 0)
    .map(([insumo, v]) => ({ insumo, cantidad: Number(v.cantidad), costo_unitario: Number(v.costo) }));
  const total = filas.reduce((s, f) => s + f.cantidad * f.costo_unitario, 0);

  async function guardar() {
    if (!filas.length || guardando) return;
    setError(null); setGuardando(true);
    const { error } = await opsSupabase.from('truck_compras').insert({
      folio: 'C-' + Date.now().toString(36).toUpperCase().slice(-6),
      proveedor: proveedor || null, ubicacion, items: filas, total, staff_id: staff.id,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    onListo();
  }

  const set = (id: string, campo: 'cantidad' | 'costo', v: string) =>
    setItems((x) => ({ ...x, [id]: { ...(x[id] ?? { cantidad: '', costo: '' }), [campo]: v } }));

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h3 style={{ flex: 1, fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>Nueva compra</h3>
          <button className="iconbtn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Proveedor</span>
            <select value={proveedor} onChange={(e) => setProveedor(e.target.value)} style={inp}>
              <option value="">Sin proveedor</option>
              {provs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label style={{ flex: 1, display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Entra a</span>
            <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} style={inp}>
              {ubic.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--ink-3)', margin: '16px 0 6px' }}>
          <span style={{ flex: 1 }}>Insumo</span>
          <span style={{ width: 72, textAlign: 'right' }}>Cantidad</span>
          <span style={{ width: 78, textAlign: 'right' }}>$ / unidad</span>
        </div>

        <div style={{ display: 'grid', gap: 5, maxHeight: '38vh', overflowY: 'auto' }}>
          {insumos.map((i) => {
            const v = items[i.id] ?? { cantidad: '', costo: '' };
            const activo = Number(v.cantidad) > 0;
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 9px', borderRadius: 10,
                background: activo ? 'rgba(191,160,101,.1)' : 'transparent' }}>
                <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                  {i.nombre}
                  <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 5 }}>
                    {i.costo_unitario != null ? `hoy ${money(i.costo_unitario)}` : 'sin costo'}
                  </span>
                </span>
                <input type="number" inputMode="decimal" min={0} value={v.cantidad}
                  onChange={(e) => set(i.id, 'cantidad', e.target.value)} placeholder="0"
                  style={{ ...inp, width: 72, padding: '7px 9px', textAlign: 'right', fontWeight: 700 }} />
                <input type="number" inputMode="decimal" min={0} value={v.costo}
                  onChange={(e) => set(i.id, 'costo', e.target.value)}
                  placeholder={i.costo_unitario != null ? String(i.costo_unitario) : '0'}
                  style={{ ...inp, width: 78, padding: '7px 9px', textAlign: 'right', fontWeight: 700 }} />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14,
          paddingTop: 12, borderTop: '1px solid var(--line-fuerte)' }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>Total</span>
          <b style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{money(total)}</b>
        </div>

        {error && <p style={{ fontSize: 12.5, color: 'var(--terra)', marginTop: 9 }}>{error}</p>}
        <button className="btn" onClick={guardar} disabled={!filas.length || guardando}
          style={{ marginTop: 12, padding: '13px 18px', opacity: filas.length ? 1 : .5 }}>
          {guardando ? 'Guardando…' : <><Check size={16} /> Registrar compra{filas.length > 0 && ` (${filas.length})`}</>}
        </button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '.5px solid var(--line)', background: '#fff', fontSize: 14, fontFamily: 'inherit',
};
