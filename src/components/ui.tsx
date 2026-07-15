import { useState } from 'react';
import { Flame } from 'lucide-react';
import type { Macro } from '../data/menu';

export const money = (n: number) => '$' + n.toFixed(0);

/** Foto premium del bowl. Mientras no subas /bowls/<id>.jpg, muestra un placeholder
 *  elegante (degradado con el acento del bowl) — nunca una imagen rota. */
export function BowlPhoto({ src, accent, alt, radius = 0, ratio = '1/1' }: {
  src: string; accent: string; alt: string; radius?: number; ratio?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      style={{
        position: 'relative', width: '100%', aspectRatio: ratio, borderRadius: radius,
        overflow: 'hidden', background: `radial-gradient(120% 120% at 30% 20%, ${accent}22, transparent 60%), linear-gradient(160deg, #17322C, #0E2521)`,
        display: 'grid', placeItems: 'center',
      }}
    >
      {src && ok ? (
        <img src={src} alt={alt} onError={() => setOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', gap: 8, color: accent, opacity: .9 }}>
          <BowlGlyph color={accent} />
        </div>
      )}
    </div>
  );
}

function BowlGlyph({ color }: { color: string }) {
  return (
    <svg width="66" height="66" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M6 21h36c0 9.5-7.4 17-18 17S6 30.5 6 21Z" fill={color} fillOpacity=".22" stroke={color} strokeWidth="1.6" />
      <path d="M14 21c0-5 4-9 10-9s10 4 10 9" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
      <circle cx="19" cy="16" r="2.2" fill={color} opacity=".7" /><circle cx="27" cy="14.5" r="2.2" fill={color} opacity=".55" />
    </svg>
  );
}

/** Fila de macros compacta (cal · P · C · G). */
export function MacroRow({ m, dark }: { m: Macro; dark?: boolean }) {
  const c = dark ? 'var(--on-dark)' : 'var(--ink)';
  const c2 = dark ? 'var(--on-dark-2)' : 'var(--ink-2)';
  const cell = (v: string, l: string) => (
    <div style={{ display: 'grid', gap: 1 }}>
      <b className="tabular" style={{ fontSize: 15, color: c, fontWeight: 700 }}>{v}</b>
      <span style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: c2, fontWeight: 600 }}>{l}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 22 }}>
      {cell(String(Math.round(m.kcal)), 'kcal')}
      {cell(Math.round(m.p) + 'g', 'prot')}
      {cell(Math.round(m.c) + 'g', 'carb')}
      {cell(Math.round(m.f) + 'g', 'grasa')}
    </div>
  );
}

export function SpiceTag() {
  return (
    <span className="chip" style={{ background: 'rgba(199,91,58,.12)', color: 'var(--terra)' }}>
      <Flame size={13} strokeWidth={2.4} /> Picante
    </span>
  );
}
