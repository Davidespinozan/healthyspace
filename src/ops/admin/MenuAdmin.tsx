import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { opsSupabase } from '../supabase';

// Administración del menú: precio, agotado del día y visibilidad. Lo que se
// guarda aquí es lo que ve el cliente en la app (sin redeploy).
interface Row {
  id: string;
  name: string;
  tagline: string | null;
  price: number;
  active: boolean;
  sold_out: boolean;
  sort: number;
}

export function MenuAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void opsSupabase
      .from('truck_bowls')
      .select('id,name,tagline,price,active,sold_out,sort')
      .order('sort')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setRows((data ?? []).map((r) => ({ ...r, price: Number(r.price) })));
      });
  }, []);

  /** Guarda un cambio puntual y refleja el estado real que quedó en la BD. */
  async function patch(id: string, values: Partial<Row>) {
    setError(null);
    setSaving(id);
    const { error } = await opsSupabase
      .from('truck_bowls')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id);
    setSaving(null);
    if (error) { setError(error.message); return; }
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...values } : r)) ?? rs);
    setSaved(id);
    setTimeout(() => setSaved((s) => (s === id ? null : s)), 1600);
  }

  if (!rows) return <Pad>Cargando menú…</Pad>;

  return (
    <div style={{ padding: '16px 16px 40px', display: 'grid', gap: 12, maxWidth: 720, margin: '0 auto' }}>
      <div>
        <h2 className="h-2">Menú</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          El precio y el “agotado” se aplican en la app del cliente al instante.
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FBE9E4', color: '#8A2F16', fontSize: 13 }}>{error}</div>
      )}

      {rows.map((r) => (
        <div key={r.id} className="card" style={{ padding: 14, display: 'grid', gap: 12, opacity: r.active ? 1 : .58 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15.5 }}>{r.name}</div>
              <div className="muted" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tagline}</div>
            </div>
            {saving === r.id && <Loader2 size={17} className="spin" color="var(--ink-3)" />}
            {saved === r.id && <Check size={17} color="var(--forest)" strokeWidth={2.6} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
              <span className="muted">Precio</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ color: 'var(--ink-3)' }}>$</span>
                <input
                  type="number" inputMode="numeric" min={0} defaultValue={r.price}
                  onBlur={(e) => {
                    const price = Number(e.target.value);
                    if (Number.isFinite(price) && price >= 0 && price !== r.price) void patch(r.id, { price });
                  }}
                  style={{ width: 78, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream)', fontWeight: 700, fontSize: 14 }}
                />
              </span>
            </label>

            <Toggle label="Agotado hoy" on={r.sold_out} onChange={(v) => void patch(r.id, { sold_out: v })} tone="warn" />
            <Toggle label="Visible" on={r.active} onChange={(v) => void patch(r.id, { active: v })} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange, tone }: { label: string; on: boolean; onChange: (v: boolean) => void; tone?: 'warn' }) {
  const active = tone === 'warn' ? '#C75B3A' : 'var(--forest)';
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999,
        border: `1px solid ${on ? active : 'var(--line)'}`,
        background: on ? active : 'transparent', color: on ? '#fff' : 'var(--ink-2)',
        fontSize: 13, fontWeight: 700,
      }}
      aria-pressed={on}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: on ? '#fff' : 'var(--ink-4, #B9B7AC)' }} />
      {label}
    </button>
  );
}

function Pad({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '18vh 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>{children}</div>;
}
