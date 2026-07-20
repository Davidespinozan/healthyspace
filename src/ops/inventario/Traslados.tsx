import { useCallback, useEffect, useState } from 'react';
import { Truck, Check, Plus, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Traslados entre ubicaciones: el remolque pide, el almacén surte, el remolque acusa.
 *
 * Tres estados a propósito. La mercancía que salió y no ha llegado queda "en
 * tránsito" — contada en ningún lado. Si saliera y entrara de un golpe, lo que se
 * pierde en el camino nunca aparecería.
 */
interface Item { insumo: string; cantidad: number }
interface Traslado {
  id: string; folio: string; origen: string; destino: string;
  estado: 'solicitado' | 'enviado' | 'recibido' | 'cancelado';
  items: Item[]; nota: string | null; created_at: string; enviado_en: string | null;
  faltante: { insumo: string; enviado: number; llego: number }[] | null;
}
interface Ubic { id: string; nombre: string; tipo: string }
interface Insumo { id: string; nombre: string; unidad: string; categoria: string }

const ESTADO = {
  solicitado: { l: 'Pedido', c: 'var(--gold)' },
  enviado: { l: 'En camino', c: 'var(--terra)' },
  recibido: { l: 'Recibido', c: 'var(--ok)' },
  cancelado: { l: 'Cancelado', c: 'var(--ink-3)' },
} as const;

export function Traslados({ staff }: { staff: Staff }) {
  const [lista, setLista] = useState<Traslado[]>([]);
  const [ubic, setUbic] = useState<Ubic[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [nuevo, setNuevo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: t }, { data: u }, { data: i }] = await Promise.all([
      opsSupabase.from('truck_traslados').select('*').order('created_at', { ascending: false }).limit(40),
      opsSupabase.from('truck_ubicaciones').select('id,nombre,tipo').eq('activa', true).order('orden'),
      opsSupabase.from('truck_insumos').select('id,nombre,unidad,categoria').eq('activo', true).order('nombre'),
    ]);
    setLista((t as Traslado[]) ?? []);
    setUbic((u as Ubic[]) ?? []);
    setInsumos((i as Insumo[]) ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const nom = Object.fromEntries(ubic.map((u) => [u.id, u.nombre]));
  const nomIns = Object.fromEntries(insumos.map((i) => [i.id, i]));

  async function accion(t: Traslado, fn: 'enviar_traslado' | 'recibir_traslado', args?: object) {
    setError(null);
    const { error } = await opsSupabase.rpc(fn, { p_id: t.id, ...args });
    if (error) { setError(error.message); return; }
    void cargar();
  }

  if (cargando) return <div className="ops-center">Cargando traslados…</div>;

  const enCamino = lista.filter((t) => t.estado === 'enviado');
  const pedidos = lista.filter((t) => t.estado === 'solicitado');
  const cerrados = lista.filter((t) => t.estado === 'recibido' || t.estado === 'cancelado').slice(0, 8);

  return (
    <>
      <OpsHead kicker="Movimiento entre ubicaciones" titulo="Traslados"
        sub="Lo que salió y no ha llegado queda en tránsito: contado en ningún lado.">
        <div className="ops-seg">
          <button className="on" onClick={() => setNuevo(true)}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Solicitar</button>
          <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </OpsHead>

      {error && <div className="ops-pend"><div className="ops-pend-t"><AlertTriangle size={15} /> {error}</div></div>}

      {enCamino.length > 0 && (
        <Card titulo={`En camino (${enCamino.length})`} icono={<Truck size={15} />}>
          {enCamino.map((t) => (
            <Renglon key={t.id} t={t} nom={nom} nomIns={nomIns}
              accion={<button className="btn" style={{ padding: '8px 14px', fontSize: 12.5 }}
                onClick={() => accion(t, 'recibir_traslado')}>Recibí todo</button>} />
          ))}
        </Card>
      )}

      {pedidos.length > 0 && (
        <Card titulo={`Por surtir (${pedidos.length})`}>
          {pedidos.map((t) => (
            <Renglon key={t.id} t={t} nom={nom} nomIns={nomIns}
              accion={(staff.role === 'admin' || staff.role === 'almacen') ? (
                <button className="btn" style={{ padding: '8px 14px', fontSize: 12.5 }}
                  onClick={() => accion(t, 'enviar_traslado')}>Enviar</button>
              ) : <span className="ops-bar-n">Esperando almacén</span>} />
          ))}
        </Card>
      )}

      {enCamino.length === 0 && pedidos.length === 0 && (
        <div className="ops-ok">Nada pendiente: sin solicitudes por surtir ni mercancía en camino.</div>
      )}

      {cerrados.length > 0 && (
        <Card titulo="Cerrados">
          {cerrados.map((t) => <Renglon key={t.id} t={t} nom={nom} nomIns={nomIns} />)}
        </Card>
      )}

      {nuevo && (
        <SheetNuevo staff={staff} ubic={ubic} insumos={insumos}
          onCerrar={() => setNuevo(false)} onListo={() => { setNuevo(false); void cargar(); }} />
      )}
    </>
  );
}

function Renglon({ t, nom, nomIns, accion }: {
  t: Traslado; nom: Record<string, string>; nomIns: Record<string, Insumo>; accion?: React.ReactNode;
}) {
  const e = ESTADO[t.estado];
  return (
    <div className="ops-row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 13.5 }}>{nom[t.origen] ?? t.origen} → {nom[t.destino] ?? t.destino}</b>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em',
            textTransform: 'uppercase', color: e.c }}>{e.l}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.45 }}>
          {t.items.map((i) => `${i.cantidad} ${nomIns[i.insumo]?.unidad ?? ''} ${nomIns[i.insumo]?.nombre ?? i.insumo}`).join(' · ')}
        </p>
        {t.faltante && (
          <p style={{ fontSize: 11.5, color: 'var(--terra)', marginTop: 3, fontWeight: 700 }}>
            Faltó: {t.faltante.map((f) => `${f.enviado - f.llego} ${nomIns[f.insumo]?.nombre ?? f.insumo}`).join(', ')}
          </p>
        )}
      </div>
      {accion}
    </div>
  );
}

/** Solicitar: de dónde, a dónde y qué. */
function SheetNuevo({ staff, ubic, insumos, onCerrar, onListo }: {
  staff: Staff; ubic: Ubic[]; insumos: Insumo[]; onCerrar: () => void; onListo: () => void;
}) {
  const [origen, setOrigen] = useState('almacen');
  const [destino, setDestino] = useState(staff.branch_id ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (insumo: string, cantidad: number) =>
    setItems((xs) => cantidad <= 0
      ? xs.filter((x) => x.insumo !== insumo)
      : xs.some((x) => x.insumo === insumo)
        ? xs.map((x) => (x.insumo === insumo ? { ...x, cantidad } : x))
        : [...xs, { insumo, cantidad }]);

  const valido = origen && destino && origen !== destino && items.length > 0;

  async function guardar() {
    if (!valido || guardando) return;
    setError(null); setGuardando(true);
    const folio = 'TR-' + Date.now().toString(36).toUpperCase().slice(-6);
    const { error } = await opsSupabase.from('truck_traslados').insert({
      folio, origen, destino, items, solicito: staff.id,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    onListo();
  }

  return (
    <div className="bw-sheet-bg" onClick={onCerrar}>
      <div className="bw-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h3 style={{ flex: 1, fontSize: 17, fontWeight: 900, letterSpacing: '-.02em' }}>Solicitar traslado</h3>
          <button className="iconbtn" onClick={onCerrar} aria-label="Cerrar"><X size={17} /></button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {([['De', origen, setOrigen], ['A', destino, setDestino]] as const).map(([l, val, set2]) => (
            <label key={l} style={{ flex: 1, display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{l}</span>
              <select value={val} onChange={(e) => set2(e.target.value)}
                style={{ padding: '11px 12px', borderRadius: 11, border: '1px solid var(--line)',
                  background: '#fff', fontSize: 14, fontFamily: 'inherit' }}>
                <option value="">—</option>
                {ubic.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </label>
          ))}
        </div>

        <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
          color: 'var(--ink-3)', margin: '16px 0 8px' }}>Qué se necesita</p>
        <div style={{ display: 'grid', gap: 6, maxHeight: '34vh', overflowY: 'auto' }}>
          {insumos.map((i) => {
            const cur = items.find((x) => x.insumo === i.id)?.cantidad ?? '';
            return (
              <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 11px', borderRadius: 11, background: cur ? 'rgba(191,160,101,.1)' : '#fff',
                border: '1px solid var(--line)' }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{i.nombre}</span>
                <input type="number" inputMode="decimal" min={0} value={cur}
                  onChange={(e) => set(i.id, Number(e.target.value) || 0)} placeholder="0"
                  style={{ width: 72, padding: '7px 9px', borderRadius: 9, border: '1px solid var(--line)',
                    background: 'var(--cream)', fontWeight: 700, fontSize: 14, textAlign: 'right' }} />
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)', width: 22 }}>{i.unidad}</span>
              </label>
            );
          })}
          {insumos.length === 0 && <p className="ops-empty">No hay insumos dados de alta todavía.</p>}
        </div>

        {error && <p style={{ fontSize: 12.5, color: 'var(--terra)', marginTop: 10 }}>{error}</p>}

        <button className="btn" onClick={guardar} disabled={!valido || guardando}
          style={{ marginTop: 14, padding: '13px 18px', opacity: valido ? 1 : .5 }}>
          {guardando ? 'Enviando…' : <><Check size={16} /> Solicitar {items.length > 0 && `(${items.length})`}</>}
        </button>
      </div>
    </div>
  );
}
