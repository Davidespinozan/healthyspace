import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Check, Loader2, AlertTriangle } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';

/**
 * Cierre de caja (arqueo) del turno.
 *
 * La regla de oro: NO se corrige el número para que cuadre. Se cuenta lo que hay,
 * se registra la diferencia y se explica. Un arqueo que siempre cuadra no sirve
 * para detectar nada — ni errores de cambio, ni faltantes.
 *
 * Solo cuenta el EFECTIVO: tarjeta, transferencia y marketplaces no tocan la caja.
 */
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX');

interface Estado { desde: string | null; ventas_efectivo: number; n_pedidos: number; ultimo_cierre: string | null }
interface Cierre { id: string; cerrado_en: string; esperado: number; contado: number; diferencia: number; motivo: string | null }

export function PosCaja({ staff }: { staff: Staff }) {
  const branch = staff.branch_id;
  const [estado, setEstado] = useState<Estado | null>(null);
  const [historial, setHistorial] = useState<Cierre[]>([]);
  const [fondo, setFondo] = useState('');
  const [contado, setContado] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Un turno recién abierto no tiene ventas todavía, así que `caja_estado` puede
  // regresar vacío legítimamente. Antes eso dejaba `estado` en null y la pantalla
  // se quedaba en "Cargando caja…" para siempre: el cajero no podía cerrar turno
  // y nada en pantalla explicaba por qué. Ahora el vacío se trata como turno en
  // ceros, y solo un error de verdad interrumpe.
  const [fallo, setFallo] = useState<string | null>(null);

  // El aviso de "turno cerrado" no debe sobrevivir al componente.
  const avisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (avisoRef.current) clearTimeout(avisoRef.current); }, []);

  const cargar = useCallback(async () => {
    if (!branch) return;
    const [re, rh] = await Promise.all([
      opsSupabase.rpc('caja_estado', { p_branch: branch }),
      opsSupabase.from('truck_cash_closings')
        .select('id,cerrado_en,esperado,contado,diferencia,motivo')
        .eq('branch', branch).order('cerrado_en', { ascending: false }).limit(5),
    ]);
    if (re.error) { setFallo(re.error.message); return; }
    setFallo(null);
    const e = re.data;
    const fila = (Array.isArray(e) ? e[0] : e) as Estado | undefined;
    setEstado(fila ?? { desde: null, ventas_efectivo: 0, n_pedidos: 0, ultimo_cierre: null });
    setHistorial((rh.data as Cierre[]) ?? []);
  }, [branch]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (!branch) return <Pad>Tu cuenta no tiene remolque asignado.</Pad>;
  if (fallo) return (
    <Pad>
      No se pudo consultar la caja.<br />
      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{fallo}</span><br />
      <button className="btn" style={{ marginTop: 16 }} onClick={() => void cargar()}>Reintentar</button>
    </Pad>
  );
  if (!estado) return <Pad>Cargando caja…</Pad>;

  const fondoN = Number(fondo) || 0;
  const esperado = fondoN + Number(estado.ventas_efectivo || 0);
  const contadoN = contado === '' ? null : Number(contado);
  const dif = contadoN === null ? null : contadoN - esperado;
  const hayDif = dif !== null && Math.abs(dif) >= 1;
  const puedeCerrar = contadoN !== null && (!hayDif || motivo.trim().length > 2);

  async function cerrar() {
    if (!puedeCerrar || guardando || contadoN === null) return;
    setError(null); setGuardando(true);
    const { error } = await opsSupabase.from('truck_cash_closings').insert({
      branch, staff_id: staff.id,
      abierto_desde: estado!.desde,
      fondo_inicial: fondoN,
      esperado,
      contado: contadoN,
      motivo: hayDif ? motivo.trim() : null,
      ventas_efectivo: Number(estado!.ventas_efectivo || 0),
      n_pedidos: estado!.n_pedidos,
    });
    setGuardando(false);
    if (error) { setError(error.message); return; }
    setListo(true);
    setFondo(''); setContado(''); setMotivo('');
    void cargar();
    if (avisoRef.current) clearTimeout(avisoRef.current);
    avisoRef.current = setTimeout(() => setListo(false), 2600);
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 16px 40px', display: 'grid', gap: 16 }}>
      <div>
        <div className="section-label">Cierre de turno</div>
        <h2 className="h-1" style={{ fontSize: 22 }}>Caja</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          Solo efectivo. Tarjeta, transferencia y apps no pasan por aquí.
        </p>
      </div>

      {listo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: 12,
          background: 'rgba(78,122,69,.13)', color: 'var(--forest)', fontWeight: 700, fontSize: 13.5 }}>
          <Check size={17} strokeWidth={2.6} /> Turno cerrado
        </div>
      )}
      {error && <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FBE9E4', color: '#8A2F16', fontSize: 13 }}>{error}</div>}

      {/* Lo que debería haber */}
      <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <Fila label="Ventas en efectivo del turno" valor={money(estado.ventas_efectivo)}
          nota={`${estado.n_pedidos} pedido${estado.n_pedidos === 1 ? '' : 's'}${estado.desde
            ? ` · desde ${new Date(estado.desde).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            : ' · sin ventas todavía en este turno'}`} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 13.5 }}>Fondo con el que abriste</span>
          <Input value={fondo} onChange={setFondo} />
        </label>
        <hr className="hair" />
        <Fila label="Debería haber" valor={money(esperado)} fuerte />
      </div>

      {/* Lo que hay */}
      <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>¿Cuánto contaste?</span>
          <Input value={contado} onChange={setContado} grande />
        </label>

        {dif !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12,
            background: hayDif ? 'rgba(199,91,58,.1)' : 'rgba(78,122,69,.12)',
            color: hayDif ? 'var(--terra)' : 'var(--forest)' }}>
            {hayDif ? <AlertTriangle size={17} /> : <Check size={17} strokeWidth={2.6} />}
            <b style={{ fontSize: 14 }}>
              {!hayDif ? 'Cuadra exacto'
                : dif > 0 ? `Sobran ${money(dif)}`
                : `Faltan ${money(-dif)}`}
            </b>
          </div>
        )}

        {hayDif && (
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>¿Por qué? (obligatorio)</span>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
              placeholder="Ej. se dio cambio de más en un pedido"
              style={{ padding: '11px 13px', borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--cream)', fontSize: 14, fontFamily: 'inherit', resize: 'none' }} />
            <span className="muted" style={{ fontSize: 11.5 }}>
              No se corrige el número para que cuadre: se registra la diferencia y se explica.
            </span>
          </label>
        )}

        <button className="btn" onClick={cerrar} disabled={!puedeCerrar || guardando}
          style={{ padding: '14px 18px', opacity: puedeCerrar ? 1 : .5 }}>
          {guardando ? <><Loader2 size={17} className="spin" /> Cerrando…</> : <><Banknote size={17} /> Cerrar turno</>}
        </button>
      </div>

      {historial.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 6 }}>Cierres anteriores</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {historial.map((c) => (
              <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                <span className="muted tabular" style={{ fontSize: 12.5, flex: 1 }}>
                  {new Date(c.cerrado_en).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="tabular" style={{ fontSize: 12.5 }}>{money(c.contado)}</span>
                <b className="tabular" style={{ fontSize: 12.5, minWidth: 62, textAlign: 'right',
                  color: Math.abs(c.diferencia) < 1 ? 'var(--ink-3)' : 'var(--terra)' }}>
                  {Math.abs(c.diferencia) < 1 ? 'exacto' : (c.diferencia > 0 ? '+' : '') + money(c.diferencia)}
                </b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Fila({ label, valor, nota, fuerte }: { label: string; valor: string; nota?: string; fuerte?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: fuerte ? 14.5 : 13.5, fontWeight: fuerte ? 800 : 500 }}>{label}</div>
        {nota && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{nota}</div>}
      </div>
      <b className="price tabular" style={{ fontSize: fuerte ? 20 : 15 }}>{valor}</b>
    </div>
  );
}

function Input({ value, onChange, grande }: { value: string; onChange: (v: string) => void; grande?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ color: 'var(--ink-3)' }}>$</span>
      <input type="number" inputMode="numeric" min={0} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{ width: grande ? 118 : 92, padding: '10px 12px', borderRadius: 11,
          border: '1px solid var(--line)', background: 'var(--cream)',
          fontWeight: 800, fontSize: grande ? 18 : 15, textAlign: 'right' }} />
    </span>
  );
}

function Pad({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '18vh 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>{children}</div>;
}
