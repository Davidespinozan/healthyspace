import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, X, Check } from 'lucide-react';
import { opsSupabase, primerError, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';
import { dia } from '../metrics';

/**
 * Estado de resultados y gastos.
 *
 * El costo de ventas NO se estima con un porcentaje: se valúa el consumo REAL
 * registrado en el libro al costo de cada insumo. Por eso la merma va aparte —
 * mezclarla con el costo de ventas esconde justo el número que más conviene
 * vigilar, que es cuánto se está tirando.
 */
const money = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Number(n)).toLocaleString('es-MX', { maximumFractionDigits: 0 });

interface Linea { concepto: string; monto: number; pct_ventas: number | null; orden: number }
interface Gasto { categoria: string; monto: number; n: number }

const CATS = ['renta', 'nomina', 'servicios', 'combustible', 'mantenimiento', 'marketing', 'comisiones', 'impuestos', 'otros'] as const;
const CAT_LABEL: Record<string, string> = {
  renta: 'Renta', nomina: 'Nómina', servicios: 'Servicios', combustible: 'Combustible',
  mantenimiento: 'Mantenimiento', marketing: 'Marketing', comisiones: 'Comisiones',
  impuestos: 'Impuestos', otros: 'Otros',
};
const primerDia = () => { const d = new Date(); d.setDate(1); return dia(d); };

export function Finanzas({ staff }: { staff: Staff }) {
  const [pl, setPl] = useState<Linea[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [desde, setDesde] = useState(primerDia());
  const [hasta, setHasta] = useState(dia(new Date()));
  const [nuevo, setNuevo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rp, rg] = await Promise.all([
      opsSupabase.rpc('estado_resultados', { p_desde: desde, p_hasta: hasta }),
      opsSupabase.rpc('gastos_por_categoria', { p_desde: desde, p_hasta: hasta }),
    ]);
    setError(primerError(rp, rg));
    setPl((rp.data as Linea[]) ?? []);
    setGastos((rg.data as Gasto[]) ?? []);
    setCargando(false);
  }, [desde, hasta]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return <div className="ops-center">Calculando…</div>;
  // Sin esto, un estado de resultados que falla se veía como un negocio sin
  // movimiento: tarjeta vacía, sin utilidad, sin una sola palabra de por qué.
  if (error) return (
    <div className="ops-center">
      No se pudo calcular el estado de resultados.<br />
      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{error}</span><br />
      <button className="btn" style={{ marginTop: 16 }} onClick={() => void cargar()}>Reintentar</button>
    </div>
  );

  const util = pl.find((l) => l.concepto === 'Utilidad operativa');
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);

  return (
    <>
      <OpsHead kicker="Resultados" titulo="Finanzas"
        sub="El costo de ventas se valúa del consumo real, no de un porcentaje estimado.">
        <div className="ops-seg">
          <button className="on" onClick={() => setNuevo(true)}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Gasto</button>
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </OpsHead>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {([['Desde', desde, setDesde], ['Hasta', hasta, setHasta]] as const).map(([l, v, set]) => (
          <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
            <span style={{ color: 'var(--ink-2)' }}>{l}</span>
            <input type="date" value={v} onChange={(e) => set(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 10, border: '.5px solid var(--line)',
                background: '#fff', fontSize: 13, fontFamily: 'inherit' }} />
          </label>
        ))}
      </div>

      {util && (
        <div className="ops-hero">
          <div className="ops-kicker">Utilidad operativa</div>
          <div className="ops-hero-v" style={{ color: Number(util.monto) >= 0 ? '#8FCB9B' : '#E39B84' }}>
            {money(util.monto)}
          </div>
          <div className="ops-hero-row">
            <span>{util.pct_ventas != null ? `${util.pct_ventas}% de las ventas` : 'sin ventas en el periodo'}</span>
          </div>
        </div>
      )}

      <Card titulo="Estado de resultados">
        {pl.map((l) => {
          const fuerte = l.concepto.startsWith('Utilidad');
          return (
            <div key={l.concepto} style={{ display: 'flex', alignItems: 'baseline', gap: 10,
              padding: fuerte ? '11px 0' : '7px 0',
              borderTop: fuerte ? '1px solid var(--line-fuerte)' : '.5px solid var(--line)' }}>
              <span style={{ flex: 1, fontSize: fuerte ? 14 : 13.5, fontWeight: fuerte ? 800 : 500 }}>
                {l.concepto}
              </span>
              {l.pct_ventas != null && (
                <span className="ops-bar-n" style={{ minWidth: 52, textAlign: 'right' }}>{l.pct_ventas}%</span>
              )}
              <b style={{ minWidth: 96, textAlign: 'right', fontSize: fuerte ? 16 : 14,
                fontVariantNumeric: 'tabular-nums',
                color: Number(l.monto) < 0 ? 'var(--terra)' : fuerte ? 'var(--ink)' : 'var(--ink)' }}>
                {money(l.monto)}
              </b>
            </div>
          );
        })}
      </Card>

      <Card titulo="A dónde se va el dinero">
        {gastos.length === 0 && <p className="ops-empty">Sin gastos registrados en el periodo.</p>}
        {gastos.map((g) => (
          <div key={g.categoria} className="ops-bar">
            <div className="ops-bar-top">
              <span className="ops-bar-l">{CAT_LABEL[g.categoria] ?? g.categoria}</span>
              <span className="ops-bar-n">{g.n} mov.</span>
              <b className="ops-bar-v">{money(g.monto)}</b>
            </div>
            <div className="ops-bar-track">
              <div className="ops-bar-fill" style={{ width: `${totalGastos ? (Number(g.monto) / totalGastos) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </Card>

      {nuevo && <SheetGasto staff={staff} onCerrar={() => setNuevo(false)} onListo={() => { setNuevo(false); void cargar(); }} />}
    </>
  );
}

function SheetGasto({ staff, onCerrar, onListo }: { staff: Staff; onCerrar: () => void; onListo: () => void }) {
  const [categoria, setCategoria] = useState<string>('nomina');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(dia(new Date()));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valido = concepto.trim().length > 2 && Number(monto) > 0;

  async function guardar() {
    if (!valido || guardando) return;
    setError(null); setGuardando(true);
    const { error } = await opsSupabase.from('truck_gastos').insert({
      categoria, concepto: concepto.trim(), monto: Number(monto), fecha, staff_id: staff.id,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    onListo();
  }

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h3 style={{ flex: 1, fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>Registrar gasto</h3>
          <button className="iconbtn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>

        <div className="ops-seg" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          {CATS.map((c) => (
            <button key={c} className={categoria === c ? 'on' : ''} onClick={() => setCategoria(c)}>
              {CAT_LABEL[c]}
            </button>
          ))}
        </div>

        <label style={{ display: 'grid', gap: 5, marginBottom: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>¿De qué?</span>
          <input value={concepto} onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej. sueldos de la semana"
            style={{ padding: '11px 13px', borderRadius: 11, border: '.5px solid var(--line)',
              background: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Monto</span>
            <input type="number" inputMode="decimal" min={0} value={monto} onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              style={{ padding: '11px 13px', borderRadius: 11, border: '.5px solid var(--line)',
                background: '#fff', fontWeight: 800, fontSize: 16, textAlign: 'right', fontFamily: 'inherit' }} />
          </label>
          <label style={{ flex: 1, display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              style={{ padding: '11px 13px', borderRadius: 11, border: '.5px solid var(--line)',
                background: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
          </label>
        </div>

        {error && <p style={{ fontSize: 12.5, color: 'var(--terra)', marginTop: 10 }}>{error}</p>}

        <button className="btn" onClick={guardar} disabled={!valido || guardando}
          style={{ marginTop: 15, padding: '13px 18px', opacity: valido ? 1 : .5 }}>
          {guardando ? 'Guardando…' : <><Check size={16} /> Registrar</>}
        </button>
      </div>
    </div>
  );
}
