import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { opsSupabase, type Staff } from '../supabase';
import { DRINKS, EXTRAS } from '../../data/menu';

// Venta de mostrador: el que atiende arma el pedido, cobra y lo manda a la
// pantalla de pedidos en vivo. Queda registrado con su método de pago para que
// administración cuadre las ventas por remolque.

const METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'linea', label: 'Pago en línea' },
  { id: 'clip', label: 'Clip' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'uber', label: 'Uber' },
  { id: 'didi', label: 'Didi' },
] as const;
type Method = (typeof METHODS)[number]['id'];

interface Sellable { id: string; name: string; price: number; soldOut?: boolean }
interface Line { id: string; name: string; price: number; qty: number }

const money = (n: number) => '$' + n.toLocaleString('es-MX');
const saleCode = () => 'HS-' + Math.floor(1000 + Math.random() * 9000);

export function PosSale({ staff }: { staff: Staff }) {
  const [bowls, setBowls] = useState<Sellable[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<Method | null>(null);
  const [cash, setCash] = useState('');
  const [saving, setSaving] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void opsSupabase.from('truck_bowls').select('id,name,price,sold_out').eq('active', true).order('sort')
      .then(({ data }) => setBowls((data ?? []).map((b) => ({ id: b.id, name: b.name, price: Number(b.price), soldOut: b.sold_out }))));
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);
  const change = method === 'efectivo' && cash ? Number(cash) - total : null;

  const add = (s: Sellable) => {
    setDoneCode(null);
    setLines((ls) => {
      const hit = ls.find((l) => l.id === s.id);
      return hit ? ls.map((l) => (l === hit ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { id: s.id, name: s.name, price: s.price, qty: 1 }];
    });
  };
  const bump = (id: string, d: number) =>
    setLines((ls) => ls.flatMap((l) => (l.id !== id ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d }])));

  const reset = () => { setLines([]); setMethod(null); setCash(''); };

  /** Registra la venta. La sucursal es la del que cobra (admin usa la primera). */
  async function charge() {
    if (!lines.length || !method || saving) return;
    setError(null);
    setSaving(true);
    const code = saleCode();
    const { error } = await opsSupabase.from('truck_orders').insert({
      code,
      mode: 'pickup',              // se entrega en el mostrador
      channel: 'mostrador',
      items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      subtotal: total, fee: 0, discount: 0, total,
      branch: staff.branch_id,
      payment_method: method,
      paid: true,
      cash_received: method === 'efectivo' && cash ? Number(cash) : null,
      staff_id: staff.id,
      status: 'recibido',
      sealed: false,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setDoneCode(code);
    reset();
  }

  if (!staff.branch_id && staff.role !== 'admin') {
    return <Pad>Tu cuenta no tiene remolque asignado. Pídeselo a administración.</Pad>;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 16px 40px', display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1.35fr) minmax(280px,1fr)' }}>
      {/* Catálogo */}
      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <Group title="Bowls" items={bowls} onAdd={add} />
        <Group title="Bebidas" items={DRINKS.map((d) => ({ id: d.id, name: d.name, price: d.price }))} onAdd={add} />
        <Group title="Extras" items={EXTRAS.map((e) => ({ id: e.id, name: e.name, price: e.price }))} onAdd={add} />
      </div>

      {/* Cuenta */}
      <div className="card" style={{ padding: 15, display: 'grid', gap: 12, alignContent: 'start', position: 'sticky', top: 84 }}>
        <div className="section-label">La cuenta</div>

        {doneCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(78,122,69,.13)', color: 'var(--forest)', fontSize: 13.5, fontWeight: 700 }}>
            <Check size={17} strokeWidth={2.6} /> Venta {doneCode} registrada
          </div>
        )}
        {error && <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FBE9E4', color: '#8A2F16', fontSize: 13 }}>{error}</div>}

        {lines.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5, padding: '18px 0' }}>Toca los platillos para armar la cuenta.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {lines.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div className="muted tabular" style={{ fontSize: 12 }}>{money(l.price)} c/u</div>
                </div>
                <button className="iconbtn" onClick={() => bump(l.id, -1)} aria-label="Quitar uno" style={{ width: 32, height: 32 }}>
                  {l.qty === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                </button>
                <b className="tabular" style={{ width: 20, textAlign: 'center' }}>{l.qty}</b>
                <button className="iconbtn" onClick={() => bump(l.id, 1)} aria-label="Agregar uno" style={{ width: 32, height: 32 }}><Plus size={15} /></button>
                <b className="price tabular" style={{ width: 58, textAlign: 'right', fontSize: 14 }}>{money(l.price * l.qty)}</b>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', borderTop: '1px solid var(--sand)', paddingTop: 11 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
          <b className="price tabular" style={{ marginLeft: 'auto', fontSize: 22 }}>{money(total)}</b>
        </div>

        <div>
          <div className="section-label" style={{ marginBottom: 7 }}>Cómo pagó</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {METHODS.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                style={{
                  padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                  border: `1px solid ${method === m.id ? 'var(--forest)' : 'var(--line)'}`,
                  background: method === m.id ? 'var(--forest)' : 'transparent',
                  color: method === m.id ? 'var(--on-dark)' : 'var(--ink-2)',
                }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {method === 'efectivo' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="muted" style={{ fontSize: 13 }}>Paga con</span>
            <input type="number" inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="$"
              style={{ width: 92, padding: '9px 11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream)', fontWeight: 700, fontSize: 14 }} />
            {change !== null && cash !== '' && (
              <span style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 800, color: change < 0 ? 'var(--terra)' : 'var(--forest)' }}>
                {change < 0 ? `Faltan ${money(-change)}` : `Cambio ${money(change)}`}
              </span>
            )}
          </div>
        )}

        <button className="btn" onClick={charge} disabled={!lines.length || !method || saving}
          style={{ padding: '14px 18px', opacity: !lines.length || !method ? .5 : 1 }}>
          {saving ? <><Loader2 size={17} className="spin" /> Registrando…</> : <>Cobrar {money(total)}</>}
        </button>
        {lines.length > 0 && (
          <button onClick={reset} className="muted" style={{ fontSize: 13, padding: 4 }}>Cancelar la cuenta</button>
        )}
      </div>
    </div>
  );
}

function Group({ title, items, onAdd }: { title: string; items: Sellable[]; onAdd: (s: Sellable) => void }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="section-label" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {items.map((s) => (
          <button key={s.id} onClick={() => !s.soldOut && onAdd(s)} disabled={s.soldOut}
            className="card pressable"
            style={{ padding: '13px 12px', textAlign: 'left', display: 'grid', gap: 3, opacity: s.soldOut ? .45 : 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{s.name}</span>
            <span className="price tabular" style={{ fontSize: 13.5 }}>{s.soldOut ? 'Agotado' : money(s.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Pad({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '18vh 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>{children}</div>;
}
