import { useState } from 'react';
import { Flame } from 'lucide-react';
import type { Macro } from '../data/menu';

export const money = (n: number) => '$' + n.toFixed(0);

/** Foto premium del bowl. Mientras no subas /bowls/<id>.jpg, muestra un placeholder
 *  elegante (degradado con el acento del bowl + textura) — nunca una imagen rota. */
export function BowlPhoto({ src, accent, alt, radius = 0, ratio = '1/1' }: {
  src: string; accent: string; alt: string; radius?: number; ratio?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      style={{
        position: 'relative', width: '100%', aspectRatio: ratio, borderRadius: radius,
        overflow: 'hidden',
        background: `radial-gradient(130% 120% at 28% 18%, ${accent}2E, transparent 58%), linear-gradient(160deg, #1B3A33, #0C201B)`,
        display: 'grid', placeItems: 'center',
      }}
    >
      {src && ok ? (
        <img src={src} alt={alt} onError={() => setOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <>
          {/* Textura sutil sobre el placeholder */}
          <div style={{
            position: 'absolute', inset: 0, opacity: .5, mixBlendMode: 'overlay',
            background: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }} />
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center', color: accent, opacity: .92 }}>
            <BowlGlyph color={accent} />
          </div>
        </>
      )}
    </div>
  );
}

function BowlGlyph({ color }: { color: string }) {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M6 21h36c0 9.5-7.4 17-18 17S6 30.5 6 21Z" fill={color} fillOpacity=".22" stroke={color} strokeWidth="1.6" />
      <path d="M14 21c0-5 4-9 10-9s10 4 10 9" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
      <circle cx="19" cy="16" r="2.2" fill={color} opacity=".7" /><circle cx="27" cy="14.5" r="2.2" fill={color} opacity=".55" />
    </svg>
  );
}

/** Fila de macros (cal · P · C · G) con separadores hairline. */
export function MacroRow({ m, dark }: { m: Macro; dark?: boolean }) {
  const c = dark ? 'var(--on-dark)' : 'var(--ink)';
  const c2 = dark ? 'var(--on-dark-2)' : 'var(--ink-2)';
  const line = dark ? 'rgba(244,241,233,.14)' : 'var(--sand)';
  const cells: [string, string][] = [
    [String(Math.round(m.kcal)), 'kcal'],
    [Math.round(m.p) + 'g', 'prot'],
    [Math.round(m.c) + 'g', 'carb'],
    [Math.round(m.f) + 'g', 'grasa'],
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {cells.map(([v, l], i) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {i > 0 && <span style={{ width: 1, height: 22, background: line, marginRight: 'auto' }} />}
          <div style={{ display: 'grid', gap: 1, flex: i > 0 ? '0 0 auto' : 1 }}>
            <b className="tabular" style={{ fontSize: 15.5, color: c, fontWeight: 800, letterSpacing: '-.02em' }}>{v}</b>
            <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: c2, fontWeight: 700 }}>{l}</span>
          </div>
        </div>
      ))}
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
