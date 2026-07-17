import { Flame } from 'lucide-react';
import { ING, PROTEIN_CRAFT, PROTEINS, ingImg } from '../data/menu';

/** Cuenta el oficio detrás de la proteína — la razón por la que la textura no se
 *  replica en casa. Es el argumento de venta de la casa, así que se muestra grande. */
export function CraftCard({ proteinId }: { proteinId: string }) {
  const craft = PROTEIN_CRAFT[proteinId];
  const ing = ING[proteinId];
  if (!craft || !ing) return null;

  return (
    <div className="card dark-depth" style={{ background: 'var(--forest)', color: 'var(--on-dark)', padding: '18px 18px', boxShadow: 'var(--sh-md), var(--edge-dark)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(191,160,101,.16)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
          <Flame size={19} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>{ing.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--on-dark-2)', marginTop: 1 }}>{craft.method} · {craft.hours}</div>
        </div>
        <HoursBadge hours={craft.hours} />
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--on-dark-2)' }}>{craft.story}</p>
    </div>
  );
}

/** Carrusel de las proteínas de cocción lenta para el Home (la tesis de marca). */
export function CraftRail() {
  return (
    <div className="hscroll" style={{ padding: '2px 0 4px' }}>
      {PROTEINS.map((id) => {
        const ing = ING[id], craft = PROTEIN_CRAFT[id];
        if (!ing || !craft) return null;
        return (
          <div key={id} className="dark-depth" style={{
            flex: '0 0 auto', width: 224, scrollSnapAlign: 'start', borderRadius: 'var(--r-xl)', overflow: 'hidden',
            background: 'var(--forest)', color: 'var(--on-dark)',
            boxShadow: 'var(--sh-md), var(--edge-dark)',
          }}>
            <div style={{ position: 'relative', height: 116 }}>
              {ingImg(id) && <img src={ingImg(id)} alt={ing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, var(--forest))' }} />
              <span style={{ position: 'absolute', top: 11, right: 11 }}><HoursBadge hours={craft.hours} /></span>
            </div>
            <div style={{ padding: '4px 17px 17px' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.15 }}>{ing.name}</div>
            <div style={{ fontSize: 12, color: 'var(--amber-l)', fontWeight: 700, margin: '3px 0 9px' }}>{craft.method}</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--on-dark-2)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{craft.story}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HoursBadge({ hours }: { hours: string }) {
  return (
    <span className="tabular" style={{
      flex: '0 0 auto', padding: '6px 11px', borderRadius: 999, background: 'var(--amber)',
      color: 'var(--forest)', fontWeight: 900, fontSize: 12.5, letterSpacing: '-.01em',
    }}>{hours}</span>
  );
}
