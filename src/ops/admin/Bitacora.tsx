import { useCallback, useEffect, useRef, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { opsSupabase } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Bitácora: quién tocó qué.
 *
 * En un sistema con dinero e inventario, "el número está mal" es la mitad del
 * problema; la otra mitad es quién lo cambió y cuándo. Sin esto, cada descuadre
 * termina en una conversación de memoria y sospechas.
 *
 * Se llena por trigger en la base, no desde la app: si dependiera de que cada
 * pantalla se acuerde de escribir, lo primero que faltaría sería justo lo que
 * alguien quisiera ocultar.
 */
interface Fila {
  cuando: string; quien: string; tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'; registro: string | null; cambios: string[] | null;
}

const TABLA_LABEL: Record<string, string> = {
  truck_insumos: 'Insumos y costos', truck_recetas: 'Recetas',
  truck_cash_closings: 'Cierres de caja', truck_gastos: 'Gastos',
  truck_compras: 'Compras', truck_produccion: 'Producción',
  truck_traslados: 'Traslados', truck_staff: 'Equipo y permisos', truck_bowls: 'Menú y precios',
};
const OP = { INSERT: { l: 'creó', c: 'var(--ok)' }, UPDATE: { l: 'cambió', c: 'var(--gold)' }, DELETE: { l: 'borró', c: 'var(--terra)' } };

/** Los cambios que más vale la pena notar de un vistazo. */
const SENSIBLE = new Set(['costo_unitario', 'rendimiento', 'price', 'cantidad', 'role', 'active', 'contado', 'monto']);

export function Bitacora() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [tabla, setTabla] = useState<string>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `peticion` secuencia las respuestas. Sin esto, al picar "Gastos" y luego
  // "Compras" rápido, si Gastos resolvía al final quedaban los renglones de
  // Gastos bajo el filtro "Compras" resaltado, sin nada que delatara el desfase.
  const peticion = useRef(0);

  const cargar = useCallback(async () => {
    const mia = ++peticion.current;
    setCargando(true);
    const { data, error } = await opsSupabase.rpc('bitacora', { p_tabla: tabla || null, p_limite: 120 });
    if (mia !== peticion.current) return;   // llegó tarde: ya hay otro filtro
    setError(error ? error.message : null);
    setFilas((data as Fila[]) ?? []);
    setCargando(false);
  }, [tabla]);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <>
      <OpsHead kicker="Trazabilidad" titulo="Bitácora"
        sub="Se llena sola desde la base: ni el admin puede editarla.">
        <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
      </OpsHead>

      {error && <div className="ops-pend"><div className="ops-pend-t">No se pudo cargar la bitácora: {error}</div></div>}

      <div className="ops-seg" style={{ flexWrap: 'wrap' }}>
        <button className={tabla === '' ? 'on' : ''} onClick={() => setTabla('')}>Todo</button>
        {Object.entries(TABLA_LABEL).map(([k, l]) => (
          <button key={k} className={tabla === k ? 'on' : ''} onClick={() => setTabla(k)}>{l}</button>
        ))}
      </div>

      <Card titulo="Movimientos recientes" icono={<History size={15} />}>
        {cargando && <p className="ops-empty">Cargando…</p>}
        {!cargando && filas.length === 0 && <p className="ops-empty">Sin movimientos registrados.</p>}
        {filas.map((f, i) => {
          const op = OP[f.operacion];
          const sensible = f.cambios?.some((c) => SENSIBLE.has(c));
          return (
            <div key={i} className="ops-row" style={{ alignItems: 'flex-start' }}>
              <span className="ops-bar-n" style={{ width: 92, flex: '0 0 auto' }}>
                {new Date(f.cuando).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13.5 }}>
                  <b>{f.quien}</b>{' '}
                  <span style={{ color: op.c, fontWeight: 700 }}>{op.l}</span>{' '}
                  {TABLA_LABEL[f.tabla] ?? f.tabla}
                  {f.registro && <span style={{ color: 'var(--ink-3)' }}> · {f.registro}</span>}
                </span>
                {f.cambios?.length ? (
                  <p style={{ fontSize: 11.5, marginTop: 2, lineHeight: 1.4,
                    color: sensible ? 'var(--terra)' : 'var(--ink-3)',
                    fontWeight: sensible ? 700 : 400 }}>
                    {f.cambios.join(', ')}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}
