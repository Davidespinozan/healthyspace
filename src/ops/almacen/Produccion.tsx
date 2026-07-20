import { useCallback, useEffect, useState } from 'react';
import { ChefHat, Plus, X, Check, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Producción: convertir crudo en producto terminado.
 *
 * Cada tanda MIDE el rendimiento real (producido ÷ crudo consumido). Ese número
 * es el que convierte el costeo de supuesto en hecho: si la carne rinde 0.55 y
 * el sistema costea con 0.62, todos los platillos con ese insumo salen más
 * baratos de lo que son.
 */
interface Tanda {
  id: string; folio: string; producto: string; cantidad_plan: number;
  cantidad_real: number | null; origen: string; destino: string;
  estado: 'planeada' | 'en-proceso' | 'terminada' | 'cancelada';
  rendimiento_real: number | null; caduca: string | null; created_at: string;
}
interface Insumo { id: string; nombre: string; unidad: string }
interface Ubic { id: string; nombre: string; tipo: string }
interface Medido {
  producto: string; nombre: string; tandas: number;
  rendimiento_medido: number; rendimiento_cargado: number | null; desvio_pct: number | null;
}

export function Produccion({ staff }: { staff: Staff }) {
  const [tandas, setTandas] = useState<Tanda[]>([]);
  const [productos, setProductos] = useState<Insumo[]>([]);
  const [ubic, setUbic] = useState<Ubic[]>([]);
  const [medido, setMedido] = useState<Medido[]>([]);
  const [nueva, setNueva] = useState(false);
  const [cerrando, setCerrando] = useState<Tanda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: t }, { data: rp }, { data: u }, { data: m }] = await Promise.all([
      opsSupabase.from('truck_produccion').select('*').order('created_at', { ascending: false }).limit(30),
      opsSupabase.from('truck_recetas_produccion').select('producto'),
      opsSupabase.from('truck_ubicaciones').select('id,nombre,tipo').eq('activa', true).order('orden'),
      opsSupabase.rpc('rendimiento_medido'),
    ]);
    setTandas((t as Tanda[]) ?? []);
    setUbic((u as Ubic[]) ?? []);
    setMedido((m as Medido[]) ?? []);
    // Solo se puede producir lo que tiene receta de producción.
    const ids = [...new Set(((rp as { producto: string }[]) ?? []).map((r) => r.producto))];
    if (ids.length) {
      const { data: i } = await opsSupabase.from('truck_insumos').select('id,nombre,unidad').in('id', ids);
      setProductos((i as Insumo[]) ?? []);
    }
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const nomU = Object.fromEntries(ubic.map((u) => [u.id, u.nombre]));
  const nomP = Object.fromEntries(productos.map((p) => [p.id, p]));

  if (cargando) return <div className="ops-center">Cargando producción…</div>;

  const abiertas = tandas.filter((t) => t.estado === 'planeada' || t.estado === 'en-proceso');
  const cerradas = tandas.filter((t) => t.estado === 'terminada').slice(0, 10);

  return (
    <>
      <OpsHead kicker="Cocina y congeladores" titulo="Producción"
        sub="Cada tanda mide el rendimiento real: es lo que hace confiable el costeo.">
        <div className="ops-seg">
          <button className="on" onClick={() => setNueva(true)}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Nueva tanda</button>
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </OpsHead>

      {error && <div className="ops-pend"><div className="ops-pend-t">{error}</div></div>}

      {/* Lo más útil de toda la pantalla: medido vs cargado. */}
      {medido.length > 0 && (
        <Card titulo="Rendimiento medido vs. cargado" icono={<ChefHat size={15} />}>
          {medido.map((m) => {
            const mal = m.desvio_pct != null && Math.abs(m.desvio_pct) >= 5;
            return (
              <div key={m.producto} className="ops-row">
                <span className="ops-row-l">
                  {m.nombre}
                  <span className="ops-bar-n" style={{ marginLeft: 7 }}>{m.tandas} tanda{m.tandas > 1 ? 's' : ''}</span>
                </span>
                <span className="ops-row-v">cargado {((m.rendimiento_cargado ?? 0) * 100).toFixed(0)}%</span>
                <b style={{ minWidth: 58, textAlign: 'right', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  {(m.rendimiento_medido * 100).toFixed(1)}%
                </b>
                {m.desvio_pct != null && (
                  <b style={{ minWidth: 62, textAlign: 'right', fontSize: 13,
                    color: mal ? 'var(--terra)' : 'var(--ink-3)', display: 'inline-flex',
                    alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                    {m.desvio_pct < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                    {Math.abs(m.desvio_pct)}%
                  </b>
                )}
              </div>
            );
          })}
          {medido.some((m) => m.desvio_pct != null && Math.abs(m.desvio_pct) >= 5) && (
            <p style={{ fontSize: 11.5, color: 'var(--terra)', marginTop: 9, lineHeight: 1.5 }}>
              Hay desvíos de 5% o más. Mientras el cargado no se ajuste, el costo de todos
              los platillos con ese insumo está mal.
            </p>
          )}
        </Card>
      )}

      <Card titulo={`En proceso (${abiertas.length})`}>
        {abiertas.length === 0 && <p className="ops-empty">No hay tandas abiertas.</p>}
        {abiertas.map((t) => (
          <div key={t.id} className="ops-row" style={{ alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13.5 }}>{nomP[t.producto]?.nombre ?? t.producto}</b>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {t.cantidad_plan} {nomP[t.producto]?.unidad ?? ''} planeados ·
                {' '}{nomU[t.origen] ?? t.origen} → {nomU[t.destino] ?? t.destino}
              </p>
            </div>
            <button className="btn" style={{ padding: '8px 14px', fontSize: 12.5 }}
              onClick={() => setCerrando(t)}>Cerrar tanda</button>
          </div>
        ))}
      </Card>

      {cerradas.length > 0 && (
        <Card titulo="Terminadas">
          {cerradas.map((t) => (
            <div key={t.id} className="ops-row">
              <span className="ops-row-l">{nomP[t.producto]?.nombre ?? t.producto}</span>
              <span className="ops-row-v">
                {t.cantidad_real} de {t.cantidad_plan} {nomP[t.producto]?.unidad ?? ''}
              </span>
              <b style={{ minWidth: 58, textAlign: 'right', fontSize: 13,
                color: (t.rendimiento_real ?? 0) < 0.5 ? 'var(--terra)' : 'var(--ink)' }}>
                {t.rendimiento_real != null ? (t.rendimiento_real * 100).toFixed(1) + '%' : '—'}
              </b>
            </div>
          ))}
        </Card>
      )}

      {nueva && (
        <SheetNueva staff={staff} productos={productos} ubic={ubic}
          onCerrar={() => setNueva(false)} onListo={() => { setNueva(false); void cargar(); }} />
      )}
      {cerrando && (
        <SheetCerrar tanda={cerrando} unidad={nomP[cerrando.producto]?.unidad ?? ''}
          onCerrar={() => setCerrando(null)}
          onListo={() => { setCerrando(null); void cargar(); }}
          onError={setError} />
      )}
    </>
  );
}

function SheetNueva({ staff, productos, ubic, onCerrar, onListo }: {
  staff: Staff; productos: Insumo[]; ubic: Ubic[]; onCerrar: () => void; onListo: () => void;
}) {
  const [producto, setProducto] = useState(productos[0]?.id ?? '');
  const [cant, setCant] = useState('');
  const [origen, setOrigen] = useState('almacen');
  const [destino, setDestino] = useState('congelador-1');
  const [caduca, setCaduca] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valido = producto && Number(cant) > 0 && origen && destino;

  async function guardar() {
    if (!valido || guardando) return;
    setError(null); setGuardando(true);
    const { error } = await opsSupabase.from('truck_produccion').insert({
      folio: 'PR-' + Date.now().toString(36).toUpperCase().slice(-6),
      producto, cantidad_plan: Number(cant), origen, destino,
      caduca: caduca || null, staff_id: staff.id,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    onListo();
  }

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h3 style={{ flex: 1, fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>Nueva tanda</h3>
          <button className="iconbtn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>

        <Campo label="¿Qué se produce?">
          <select value={producto} onChange={(e) => setProducto(e.target.value)} style={inp}>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>

        <Campo label={`¿Cuánto se planea? (${productos.find((p) => p.id === producto)?.unidad ?? ''})`}>
          <input type="number" inputMode="decimal" min={0} value={cant} onChange={(e) => setCant(e.target.value)}
            placeholder="0" style={{ ...inp, fontWeight: 800, fontSize: 16, textAlign: 'right' }} />
        </Campo>

        <div style={{ display: 'flex', gap: 10 }}>
          <Campo label="Crudos de">
            <select value={origen} onChange={(e) => setOrigen(e.target.value)} style={inp}>
              {ubic.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Producto a">
            <select value={destino} onChange={(e) => setDestino(e.target.value)} style={inp}>
              {ubic.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Campo>
        </div>

        <Campo label="Caduca (opcional)">
          <input type="date" value={caduca} onChange={(e) => setCaduca(e.target.value)} style={inp} />
        </Campo>

        {error && <p style={{ fontSize: 12.5, color: 'var(--terra)', marginTop: 9 }}>{error}</p>}
        <button className="btn" onClick={guardar} disabled={!valido || guardando}
          style={{ marginTop: 14, padding: '13px 18px', opacity: valido ? 1 : .5 }}>
          {guardando ? 'Creando…' : <><Check size={16} /> Crear tanda</>}
        </button>
      </div>
    </div>
  );
}

function SheetCerrar({ tanda, unidad, onCerrar, onListo, onError }: {
  tanda: Tanda; unidad: string; onCerrar: () => void; onListo: () => void; onError: (e: string) => void;
}) {
  const [real, setReal] = useState('');
  const [guardando, setGuardando] = useState(false);
  const n = Number(real) || 0;

  async function cerrar() {
    if (n <= 0 || guardando) return;
    setGuardando(true);
    const { error } = await opsSupabase.rpc('cerrar_produccion', { p_id: tanda.id, p_real: n });
    setGuardando(false);
    if (error) { onError(error.message); return; }
    onListo();
  }

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>Cerrar tanda</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>
          Se planearon <b>{tanda.cantidad_plan} {unidad}</b>. Los crudos se descuentan según lo
          planeado — se metieron a la olla, salga lo que salga.
        </p>

        <Campo label={`¿Cuánto salió de verdad? (${unidad})`}>
          <input type="number" inputMode="decimal" min={0} value={real} onChange={(e) => setReal(e.target.value)}
            placeholder="0" autoFocus
            style={{ ...inp, fontWeight: 800, fontSize: 20, textAlign: 'right' }} />
        </Campo>

        {n > 0 && (
          <p style={{ fontSize: 12.5, marginTop: 8, color: n < tanda.cantidad_plan ? 'var(--terra)' : 'var(--ok)', fontWeight: 700 }}>
            {n < tanda.cantidad_plan
              ? `Salieron ${(tanda.cantidad_plan - n).toFixed(2)} ${unidad} menos de lo planeado`
              : n > tanda.cantidad_plan ? `Salieron ${(n - tanda.cantidad_plan).toFixed(2)} ${unidad} de más`
              : 'Salió exactamente lo planeado'}
          </p>
        )}

        <button className="btn" onClick={cerrar} disabled={n <= 0 || guardando}
          style={{ marginTop: 14, padding: '13px 18px', opacity: n > 0 ? 1 : .5 }}>
          {guardando ? 'Cerrando…' : <><Check size={16} /> Cerrar y medir rendimiento</>}
        </button>
        <button onClick={onCerrar} style={{ display: 'block', width: '100%', marginTop: 8,
          fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Cancelar</button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 11,
  border: '.5px solid var(--line)', background: '#fff', fontSize: 14, fontFamily: 'inherit',
};

const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: 'grid', gap: 5, marginTop: 12, flex: 1 }}>
    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
    {children}
  </label>
);
