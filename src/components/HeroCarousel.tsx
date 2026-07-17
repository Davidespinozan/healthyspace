import { useEffect, useRef, useState } from 'react';

const GRADIENT = 'linear-gradient(180deg, rgba(8,26,22,.28) 0%, rgba(8,26,22,.32) 42%, rgba(8,26,22,.90) 100%)';

/** Fondo rotativo del hero (como en sala): slides apilados con crossfade + Ken
 *  Burns en el activo, auto-rotación cada `intervalMs` (se frena con
 *  prefers-reduced-motion), puntitos y swipe táctil. */
export function HeroCarousel({ images, intervalMs = 5000 }: { images: string[]; intervalMs?: number }) {
  const n = images.length;
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (n <= 1) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), intervalMs);
    return () => clearInterval(t);
  }, [n, intervalMs]);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || n <= 1) return;
    const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
    if (Math.abs(dx) > 40) setIdx((i) => (i + (dx < 0 ? 1 : -1) + n) % n);
    startX.current = null;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {images.map((src, i) => (
        <img key={i} src={src} alt="" aria-hidden="true" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: i === idx ? 1 : 0,
          transform: i === idx ? 'scale(1.08)' : 'scale(1)',
          transition: 'opacity .9s var(--ease), transform 6s ease',
        }} />
      ))}

      {/* Degradado para legibilidad del texto */}
      <div style={{ position: 'absolute', inset: 0, background: GRADIENT }} />

      {/* Puntitos centrados abajo (el activo se alarga) */}
      {n > 1 && (
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 14, display: 'flex', gap: 6 }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Imagen ${i + 1} de ${n}`} aria-current={i === idx}
              style={{
                width: i === idx ? 18 : 7, height: 7, borderRadius: 999, border: 'none', padding: 0,
                background: i === idx ? 'var(--amber)' : 'rgba(244,241,233,.5)',
                transition: 'width .3s var(--ease), background .3s',
              }} />
          ))}
        </div>
      )}
    </div>
  );
}
