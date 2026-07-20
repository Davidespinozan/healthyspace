import { useCallback, useEffect, useState } from 'react';
import { Bike, Clock, MapPin, Phone, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { opsSupabase, primerError, type Staff } from '../supabase';
import { OpsHead, Card } from '../OpsShell';

/**
 * Reparto a domicilio.
 *
 * Se miden DOS tiempos por separado: cocina (pedido → salida) y camino (salida →
 * entrega). Un promedio total de 40 minutos no dice nada; saber que 28 son de
 * cocina y 12 de camino sí — son problemas distintos y se arreglan distinto.
 */
interface Pedido {
  id: string; code: string; status: string; total: number;
  items: { name: string; qty: number }[];
  address: string | null; direccion_ref: string | null; tel_contacto: string | null;
  customer: { name?: string; phone?: string } | null;
  repartidor_id: string | null; created_at: string; salio_en: string | null;
}
interface Rep { id: string; name: string | null }
interface Desempeno { nombre: string | null; entregas: number; min_cocina: number; min_camino: number; min_total: number }

const minutos = (desde: string) => Math.round((Date.now() - new Date(desde).getTime()) / 60000);

export function Domicilios({ staff }: { staff: Staff }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [desemp, setDesemp] = useState<Desempeno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    let q = opsSupabase.from('truck_orders').select('*')
      .eq('mode', 'delivery').not('status', 'in', '("entregado","cancelado")')
      .order('created_at');
    if (staff.role === 'pos' && staff.branch_id) q = q.eq('branch', staff.branch_id);
    const [rp, rr, rd] = await Promise.all([
      q,
      opsSupabase.from('truck_staff').select('id,name').eq('role', 'repartidor').eq('active', true),
      opsSupabase.rpc('reparto_desempeno'),
    ]);
    setError(primerError(rp, rr, rd));
    setPedidos((rp.data as Pedido[]) ?? []);
    setReps((rr.data as Rep[]) ?? []);
    setDesemp((rd.data as Desempeno[]) ?? []);
    setCargando(false);
  }, [staff.role, staff.branch_id]);

  useEffect(() => {
    void cargar();
    const ch = opsSupabase.channel('domicilios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'truck_orders' }, () => cargar())
      .subscribe();
    return () => { opsSupabase.removeChannel(ch); };
  }, [cargar]);

  // Un doble toque en "Salió" reescribe `salio_en`, que es de donde sale la
  // separación entre tiempo de cocina y tiempo de camino — justo lo que esta
  // pantalla existe para medir.
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function llamar(fn: 'despachar_pedido' | 'entregar_pedido', id: string, rep?: string) {
    if (ocupado) return;
    setError(null);
    setOcupado(id);
    const args = fn === 'despachar_pedido' ? { p_id: id, p_repartidor: rep ?? null } : { p_id: id };
    const { error } = await opsSupabase.rpc(fn, args);
    setOcupado(null);
    if (error) { setError(error.message); return; }
    void cargar();
  }

  if (cargando) return <div className="ops-center">Cargando reparto…</div>;

  const enCocina = pedidos.filter((p) => p.status !== 'camino');
  const enCamino = pedidos.filter((p) => p.status === 'camino');

  return (
    <>
      <OpsHead kicker="Reparto" titulo="Domicilios"
        sub="Se mide cocina y camino por separado: son problemas distintos.">
        <button className="iconbtn" onClick={cargar} aria-label="Actualizar"><RefreshCw size={16} /></button>
      </OpsHead>

      {error && <div className="ops-pend"><div className="ops-pend-t"><AlertTriangle size={15} /> {error}</div></div>}

      <Card titulo={`En cocina (${enCocina.length})`} icono={<Clock size={15} />}>
        {enCocina.length === 0 && <p className="ops-empty">Nada preparándose.</p>}
        {enCocina.map((p) => (
          <Fila key={p.id} p={p} reps={reps}
            accion={(rep) => llamar('despachar_pedido', p.id, rep)} etiqueta="Salió"
            ocupado={ocupado === p.id} />
        ))}
      </Card>

      <Card titulo={`En camino (${enCamino.length})`} icono={<Bike size={15} />}>
        {enCamino.length === 0 && <p className="ops-empty">Nadie en la calle.</p>}
        {enCamino.map((p) => (
          <Fila key={p.id} p={p} reps={reps}
            accion={() => llamar('entregar_pedido', p.id)} etiqueta="Entregado"
            ocupado={ocupado === p.id} />
        ))}
      </Card>

      {desemp.length > 0 && (
        <Card titulo="Tiempos de los últimos 7 días">
          <div style={{ display: 'flex', gap: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'var(--ink-3)', paddingBottom: 6 }}>
            <span style={{ flex: 1 }}>Repartidor</span>
            <span style={{ width: 52, textAlign: 'right' }}>Entregas</span>
            <span style={{ width: 56, textAlign: 'right' }}>Cocina</span>
            <span style={{ width: 56, textAlign: 'right' }}>Camino</span>
            <span style={{ width: 52, textAlign: 'right' }}>Total</span>
          </div>
          {desemp.map((d, i) => (
            <div key={i} className="ops-row" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span className="ops-row-l">{d.nombre ?? 'Sin asignar'}</span>
              <span style={{ width: 52, textAlign: 'right', fontSize: 13 }}>{d.entregas}</span>
              <span style={{ width: 56, textAlign: 'right', fontSize: 13, color: 'var(--ink-2)' }}>{d.min_cocina} min</span>
              <span style={{ width: 56, textAlign: 'right', fontSize: 13, color: 'var(--ink-2)' }}>{d.min_camino} min</span>
              <b style={{ width: 52, textAlign: 'right', fontSize: 13.5,
                color: d.min_total > 45 ? 'var(--terra)' : 'var(--ink)' }}>{d.min_total} min</b>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function Fila({ p, reps, accion, etiqueta, ocupado }: {
  p: Pedido; reps: Rep[]; accion: (rep?: string) => void; etiqueta: string; ocupado: boolean;
}) {
  const [rep, setRep] = useState(p.repartidor_id ?? reps[0]?.id ?? '');
  const espera = minutos(p.salio_en ?? p.created_at);
  const tarde = espera >= 25;

  return (
    <div className="ops-row" style={{ alignItems: 'flex-start', gap: 12, paddingTop: 11, paddingBottom: 11 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 13.5 }}>{p.code}</b>
          <span style={{ fontSize: 12, fontWeight: 700, color: tarde ? 'var(--terra)' : 'var(--ink-3)',
            display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Clock size={12} /> {espera} min
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>
          {p.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
        </p>
        {p.address && (
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4,
            display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.4 }}>
            <MapPin size={12} style={{ flex: '0 0 auto', marginTop: 2 }} />
            <span>{p.address}{p.direccion_ref ? ` · ${p.direccion_ref}` : ''}</span>
          </p>
        )}
        {(p.tel_contacto || p.customer?.phone) && (
          <a href={`tel:${p.tel_contacto ?? p.customer?.phone}`}
            style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, marginTop: 4,
              display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <Phone size={12} /> {p.tel_contacto ?? p.customer?.phone}
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gap: 6, flex: '0 0 auto' }}>
        {etiqueta === 'Salió' && reps.length > 0 && (
          <select value={rep} onChange={(e) => setRep(e.target.value)}
            style={{ padding: '7px 9px', borderRadius: 9, border: '.5px solid var(--line)',
              background: '#fff', fontSize: 12.5, fontFamily: 'inherit' }}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name ?? 'Repartidor'}</option>)}
          </select>
        )}
        <button className="btn" style={{ padding: '8px 14px', fontSize: 12.5 }}
          disabled={ocupado} onClick={() => accion(rep || undefined)}>
          {ocupado ? 'Un momento…'
            : etiqueta === 'Entregado' ? <><Check size={14} /> Entregado</> : <><Bike size={14} /> Salió</>}
        </button>
      </div>
    </div>
  );
}
