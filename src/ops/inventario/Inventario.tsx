import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, Plus, Minus, RefreshCw, Snowflake, Truck, Warehouse } from 'lucide-react';
import { opsSupabase, primerError, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Inventario por ubicación: remolques, congeladores y almacén.
 *
 * El stock NO se edita. Se registra un MOVIMIENTO (entra, sale, merma, conteo) y
 * la existencia se deriva del libro. Un número editable no dice quién lo cambió
 * ni por qué — y eso es justo lo que hace falta cuando algo no cuadra.
 */
interface Fila {
  ubicacion: string; ubicacion_nombre: string; insumo: string; insumo_nombre: string;
  categoria: 'comida' | 'empaque' | 'limpieza'; unidad: string;
  cantidad: number; min_alerta: number | null; bajo_minimo: boolean;
  agotado: boolean; negativo: boolean;
}
interface Ubic { id: string; nombre: string; tipo: string; padre: string | null }

const CAT = { comida: 'Comida', empaque: 'Empaque', limpieza: 'Limpieza' } as const;
const ICONO_UBIC: Record<string, typeof Truck> = {
  remolque: Truck, congelador: Snowflake, almacen: Warehouse, cocina: Package,
};

export function Inventario({ staff }: { staff: Staff }) {
  const [ubicaciones, setUbicaciones] = useState<Ubic[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [sel, setSel] = useState<string>(staff.branch_id ?? '');
  const [cargando, setCargando] = useState(true);
  const [mov, setMov] = useState<Fila | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [ru, rinv] = await Promise.all([
      opsSupabase.from('truck_ubicaciones').select('id,nombre,tipo,padre').eq('activa', true).order('orden'),
      opsSupabase.rpc('inventario'),
    ]);
    setError(primerError(ru, rinv));
    setUbicaciones((ru.data as Ubic[]) ?? []);
    setFilas((rinv.data as Fila[]) ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  // El POS solo ve su remolque; almacén y admin ven todo.
  const visibles = useMemo(() => (
    staff.role === 'pos' && staff.branch_id
      ? ubicaciones.filter((u) => u.id === staff.branch_id)
      : ubicaciones
  ), [ubicaciones, staff]);

  useEffect(() => { if (!sel && visibles.length) setSel(visibles[0].id); }, [visibles, sel]);

  const deUbic = filas.filter((f) => f.ubicacion === sel);
  // Se separan a propósito: "se acabó" y "el sistema dice menos que cero" son
  // urgencias distintas. Un negativo significa que se vendió más de lo registrado
  // — hay un movimiento que nunca se capturó.
  const negativos = filas.filter((f) => f.negativo);
  const agotados = filas.filter((f) => f.agotado && !f.negativo);
  const bajos = filas.filter((f) => f.bajo_minimo && !f.agotado);
  const porCat = (c: string) => deUbic.filter((f) => f.categoria === c);

  if (cargando) return <div className="ops-center">Cargando inventario…</div>;

  return (
    <>
      {error && <div className="ops-pend"><div className="ops-pend-t"><AlertTriangle size={15} /> No se pudo cargar el inventario: {error}</div></div>}

      <OpsHead kicker="Existencias" titulo="Inventario"
        sub="El stock se deriva de los movimientos: nunca se edita a mano.">
        <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
      </OpsHead>

      {(negativos.length > 0 || agotados.length > 0 || bajos.length > 0) && staff.role !== 'pos' && (
        <div className="ops-pend">
          <div className="ops-pend-t"><AlertTriangle size={16} /> Requiere atención</div>
          {negativos.slice(0, 4).map((f) => (
            <div key={'n' + f.ubicacion + f.insumo} className="ops-pend-item">
              <b style={{ color: 'var(--terra)' }}>{f.insumo_nombre} en NEGATIVO ({f.cantidad} {f.unidad})</b>
              <p>{f.ubicacion_nombre} · se consumió más de lo registrado: falta capturar una entrada</p>
            </div>
          ))}
          {agotados.slice(0, 5).map((f) => (
            <div key={'a' + f.ubicacion + f.insumo} className="ops-pend-item">
              <b>{f.insumo_nombre} — SE ACABÓ</b>
              <p>{f.ubicacion_nombre}</p>
            </div>
          ))}
          {bajos.slice(0, 5).map((f) => (
            <div key={'b' + f.ubicacion + f.insumo} className="ops-pend-item">
              <b>{f.insumo_nombre} — {f.cantidad} {f.unidad}</b>
              <p>{f.ubicacion_nombre} · mínimo {f.min_alerta} {f.unidad}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selector de ubicación */}
      <div className="ops-seg" style={{ flexWrap: 'wrap' }}>
        {visibles.map((u) => {
          const Ico = ICONO_UBIC[u.tipo] ?? Package;
          return (
            <button key={u.id} className={sel === u.id ? 'on' : ''} onClick={() => setSel(u.id)}>
              <Ico size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
              {u.nombre}
            </button>
          );
        })}
      </div>

      {(['comida', 'empaque', 'limpieza'] as const).map((c) => (
        <Card key={c} titulo={CAT[c]} icono={<Package size={15} />}>
          {porCat(c).length === 0 && <p className="ops-empty">Sin existencias registradas.</p>}
          {porCat(c).map((f) => (
            <div key={f.insumo} className="ops-row">
              <span className="ops-row-l">
                {f.insumo_nombre}
                {f.negativo ? <b style={{ color: 'var(--terra)', marginLeft: 7, fontSize: 11 }}>NEGATIVO</b>
                  : f.agotado ? <b style={{ color: 'var(--terra)', marginLeft: 7, fontSize: 11 }}>AGOTADO</b>
                  : f.bajo_minimo ? <b style={{ color: 'var(--gold)', marginLeft: 7, fontSize: 11 }}>BAJO</b> : null}
              </span>
              <b className="ops-row-q" style={{ width: 'auto', minWidth: 68, textAlign: 'right' }}>
                {f.cantidad} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>{f.unidad}</span>
              </b>
              <button className="iconbtn" style={{ width: 30, height: 30 }}
                onClick={() => setMov(f)} aria-label="Registrar movimiento">
                <Plus size={15} />
              </button>
            </div>
          ))}
        </Card>
      ))}

      {mov && <SheetMovimiento fila={mov} staff={staff} onCerrar={() => setMov(null)} onListo={() => { setMov(null); void cargar(); }} />}
    </>
  );
}

/** Registrar entrada, salida o merma. Nunca "poner" una cantidad: siempre un delta,
 *  salvo el conteo físico, que se convierte en el ajuste que corresponda. */
function SheetMovimiento({ fila, staff, onCerrar, onListo }: {
  fila: Fila; staff: Staff; onCerrar: () => void; onListo: () => void;
}) {
  const [tipo, setTipo] = useState<'entrada' | 'salida' | 'merma' | 'conteo'>('entrada');
  const [cant, setCant] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Number(cant) || 0;
  const delta = tipo === 'entrada' ? n : tipo === 'salida' || tipo === 'merma' ? -n : n - fila.cantidad;
  const valido = n > 0 && delta !== 0 && (tipo !== 'merma' || nota.trim().length > 2);

  async function guardar() {
    if (!valido || guardando) return;
    setError(null); setGuardando(true);
    const { error } = await opsSupabase.from('truck_movimientos').insert({
      ubicacion: fila.ubicacion, insumo: fila.insumo, cambio: delta,
      motivo: tipo === 'conteo' ? 'conteo' : tipo === 'merma' ? 'merma' : tipo === 'entrada' ? 'compra' : 'ajuste',
      nota: nota.trim() || null, staff_id: staff.id,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    onListo();
  }

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3 style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>{fila.insumo_nombre}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>
          {fila.ubicacion_nombre} · hay <b>{fila.cantidad} {fila.unidad}</b>
        </p>

        <div className="ops-seg" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          {([['entrada', 'Entró'], ['salida', 'Salió'], ['merma', 'Merma'], ['conteo', 'Conteo físico']] as const).map(([k, l]) => (
            <button key={k} className={tipo === k ? 'on' : ''} onClick={() => setTipo(k)}>{l}</button>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>
            {tipo === 'conteo' ? '¿Cuánto contaste?' : '¿Cuánto?'}
          </span>
          <input type="number" inputMode="decimal" min={0} value={cant} onChange={(e) => setCant(e.target.value)}
            style={{ width: 110, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)',
              background: 'var(--cream)', fontWeight: 800, fontSize: 17, textAlign: 'right' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{fila.unidad}</span>
        </label>

        {tipo === 'conteo' && n > 0 && delta !== 0 && (
          <p style={{ fontSize: 12.5, color: delta < 0 ? 'var(--terra)' : 'var(--forest)', marginTop: 8, fontWeight: 700 }}>
            {delta < 0 ? `Faltan ${-delta}` : `Sobran ${delta}`} {fila.unidad} contra lo registrado
          </p>
        )}

        {(tipo === 'merma' || tipo === 'conteo') && (
          <label style={{ display: 'grid', gap: 5, marginTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              ¿Por qué? {tipo === 'merma' && '(obligatorio)'}
            </span>
            <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder={tipo === 'merma' ? 'Ej. se echó a perder' : 'Ej. conteo de cierre de mes'}
              style={{ padding: '11px 13px', borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--cream)', fontSize: 14, fontFamily: 'inherit', resize: 'none' }} />
          </label>
        )}

        {error && <p style={{ fontSize: 12.5, color: 'var(--terra)', marginTop: 9 }}>{error}</p>}

        <button className="btn" onClick={guardar} disabled={!valido || guardando}
          style={{ marginTop: 15, padding: '13px 18px', opacity: valido ? 1 : .5 }}>
          {guardando ? 'Guardando…' : <>{delta > 0 ? <Plus size={16} /> : <Minus size={16} />} Registrar movimiento</>}
        </button>
        <button onClick={onCerrar} style={{ display: 'block', width: '100%', marginTop: 8,
          fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Cancelar</button>
      </div>
    </div>
  );
}
