import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, RefreshCw, Scale } from 'lucide-react';
import { opsSupabase } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Costeo unitario: cuánto cuesta de verdad cada platillo y cuánto deja.
 *
 * La columna que importa es RENDIMIENTO. Sin ella el costeo es ficción: la receta
 * dice 180 g de chamberete servido, pero del inventario salen 290 porque pierde
 * ~38% al brasearse. Descontar lo servido deja el inventario largo y el costo
 * barato — los dos errores a la vez, y en la dirección que más engaña.
 */
const money = (n: number) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Fila {
  producto: string; nombre: string; precio: number;
  costo_comida: number; costo_empaque: number; costo_total: number;
  margen: number; food_cost_pct: number | null; sin_costo: number;
}
interface Detalle {
  insumo_nombre: string; categoria: string; unidad: string;
  servido: number; rendimiento: number; bruto: number;
  costo_unitario: number | null; costo: number; pct: number | null;
}

/** Referencia de industria: arriba de 35% el platillo empieza a apretar. */
const tono = (p: number | null) => (p == null ? 'var(--ink-3)' : p <= 35 ? 'var(--ok)' : p <= 42 ? 'var(--gold)' : 'var(--terra)');

export function Costeo() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Detalle[]>([]);
  const [errorDet, setErrorDet] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data } = await opsSupabase.rpc('costeo_platillos');
    setFilas((data as Fila[]) ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  // Picar el platillo A y luego el B: si A resolvía al final, se cerraba B y se
  // abría A. El contador descarta las respuestas que ya no corresponden.
  const peticion = useRef(0);

  async function abrir(id: string) {
    if (abierto === id) { setAbierto(null); return; }
    const mia = ++peticion.current;
    const { data, error } = await opsSupabase.rpc('costeo_detalle', { p_producto: id });
    if (mia !== peticion.current) return;
    if (error) { setErrorDet(error.message); setDetalle([]); setAbierto(id); return; }
    setErrorDet(null);
    setDetalle((data as Detalle[]) ?? []);
    setAbierto(id);
  }

  if (cargando) return <div className="ops-center">Calculando costos…</div>;

  const sinCosto = filas.reduce((n, f) => n + f.sin_costo, 0);

  return (
    <>
      <OpsHead kicker="Cuánto cuesta cada platillo" titulo="Costeo"
        sub="El costo sale del BRUTO (lo que sale del inventario), no de lo servido.">
        <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
      </OpsHead>

      {sinCosto > 0 && (
        <div className="ops-pend">
          <div className="ops-pend-t"><AlertTriangle size={16} /> Costeo incompleto</div>
          <div className="ops-pend-item">
            <b>{sinCosto} insumo{sinCosto > 1 ? 's' : ''} sin costo cargado</b>
            <p>Mientras falten, el costo del platillo sale más barato de lo que es.</p>
          </div>
        </div>
      )}

      <Card titulo="Por platillo" icono={<Scale size={15} />}>
        {filas.map((f) => (
          <div key={f.producto}>
            <button onClick={() => abrir(f.producto)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '11px 0', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer',
                borderTop: '.5px solid var(--line)' }}>
              <ChevronRight size={15} style={{ color: 'var(--ink-3)', flex: '0 0 auto',
                transform: abierto === f.producto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{f.nombre}</span>
              <span className="ops-bar-n" style={{ minWidth: 54, textAlign: 'right' }}>{money(f.precio)}</span>
              <span style={{ minWidth: 62, textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                {money(f.costo_total)}
              </span>
              <b style={{ minWidth: 62, textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                {money(f.margen)}
              </b>
              <b style={{ minWidth: 52, textAlign: 'right', fontSize: 13.5, color: tono(f.food_cost_pct) }}>
                {f.food_cost_pct != null ? f.food_cost_pct + '%' : '—'}
              </b>
            </button>

            {abierto === f.producto && (
              <div style={{ padding: '4px 0 14px 25px' }}>
                {/* Sin esto, un detalle que falla se veía como un platillo sin
                    ingredientes, que es justo lo contrario de lo que pasó. */}
                {errorDet && <p style={{ fontSize: 12.5, color: 'var(--terra)', padding: '6px 0' }}>
                  No se pudo cargar el desglose: {errorDet}</p>}
                {!errorDet && detalle.length === 0 && <p className="ops-empty">Este platillo no tiene receta cargada.</p>}
                <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 800,
                  letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', paddingBottom: 6 }}>
                  <span style={{ flex: 1 }}>Insumo</span>
                  <span style={{ width: 56, textAlign: 'right' }}>Servido</span>
                  <span style={{ width: 46, textAlign: 'right' }}>Rend.</span>
                  <span style={{ width: 62, textAlign: 'right' }}>Bruto</span>
                  <span style={{ width: 62, textAlign: 'right' }}>Costo</span>
                </div>
                {detalle.map((d) => (
                  <div key={d.insumo_nombre} style={{ display: 'flex', gap: 8, fontSize: 12.5,
                    padding: '5px 0', borderTop: '.5px solid var(--line)', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ flex: 1 }}>
                      {d.insumo_nombre}
                      {d.costo_unitario == null && <b style={{ color: 'var(--terra)', marginLeft: 6, fontSize: 10 }}>SIN COSTO</b>}
                    </span>
                    <span style={{ width: 56, textAlign: 'right' }}>{d.servido} {d.unidad}</span>
                    <span style={{ width: 46, textAlign: 'right', color: d.rendimiento < 1 ? 'var(--terra)' : 'var(--ink-3)' }}>
                      {(d.rendimiento * 100).toFixed(0)}%
                    </span>
                    <span style={{ width: 62, textAlign: 'right', fontWeight: 700 }}>{d.bruto} {d.unidad}</span>
                    <span style={{ width: 62, textAlign: 'right' }}>{money(d.costo)}</span>
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.5 }}>
                  <b>Rendimiento</b> = aprovechable ÷ comprado. Se mide en cocina: pesa como llega,
                  limpia o cuece como en operación, vuelve a pesar. Tres veces y promedia.
                </p>
              </div>
            )}
          </div>
        ))}
      </Card>

      <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Referencia: en restaurantes un food cost sano ronda <b>28–35%</b>.
        Arriba de 42% el platillo aprieta el margen aunque se venda bien.
      </p>
    </>
  );
}
