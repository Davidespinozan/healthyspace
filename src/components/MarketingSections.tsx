import { Flame, Leaf, UtensilsCrossed, Star, Quote } from 'lucide-react';
import { BUSINESS } from '../data/business';

// ⚠️ Testimonios de ejemplo — reemplaza con reseñas reales (Google/Instagram).
const REVIEWS = [
  { name: 'Andrea M.', text: 'El chamberete se deshace solo. Nunca había probado un bowl así en Culiacán.', stars: 5 },
  { name: 'Diego R.', text: 'Porciones que llenan de verdad y se ve increíble. No parece “comida sana”.', stars: 5 },
  { name: 'Sofía L.', text: 'El pollo de cocción lenta es otra cosa. Ya vengo cada semana.', stars: 5 },
];

const PILLARS = [
  { Icon: Flame, title: 'Cocción lenta', desc: 'Horas de braseado para una textura que no se replica en casa.' },
  { Icon: Leaf, title: 'Ingredientes frescos', desc: 'Verduras, aguacate y salsas hechas el mismo día.' },
  { Icon: UtensilsCrossed, title: 'Porciones abundantes', desc: 'Bowls que llenan de verdad. Salud sin sacrificar el sabor.' },
];

/** Filosofía de la casa — vende las 3 promesas del brief, no la dieta. */
export function Pillars() {
  return (
    <section style={{ display: 'grid', gap: 15 }}>
      <div>
        <div className="section-label">Nuestra filosofía</div>
        <h2 className="h-1" style={{ fontSize: 21, marginTop: 3 }}>Rico primero. Sano siempre.</h2>
        <div className="section-line" />
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {PILLARS.map(({ Icon, title, desc }) => (
          <div key={title} className="card" style={{ display: 'flex', gap: 13, padding: '15px 16px', alignItems: 'center', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--cream-2)', color: 'var(--amber-deep)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <Icon size={21} strokeWidth={2.1} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.4, marginTop: 1 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Prueba social — reseñas + rating + CTA de Google. */
export function SocialProof() {
  const openReview = () => {
    if (BUSINESS.googleReviewUrl) window.open(BUSINESS.googleReviewUrl, '_blank', 'noopener');
    else window.open(`https://instagram.com/${BUSINESS.instagram}`, '_blank', 'noopener');
  };
  return (
    <section style={{ display: 'grid', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <div className="section-label">Lo que dicen</div>
          <h2 className="h-1" style={{ fontSize: 21, marginTop: 3 }}>La gente vuelve</h2>
          <div className="section-line" />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: 2, color: 'var(--amber)', justifyContent: 'flex-end' }}>
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}
          </div>
          <div className="tabular" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginTop: 2 }}>4.9 · Culiacán</div>
        </div>
      </div>

      <div className="hscroll" style={{ padding: '2px 0 4px' }}>
        {REVIEWS.map((r) => (
          <div key={r.name} className="card" style={{ flex: '0 0 auto', width: 240, scrollSnapAlign: 'start', padding: '16px 16px', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <Quote size={20} color="var(--amber)" strokeWidth={2.2} />
            <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: '9px 0 12px' }}>{r.text}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--forest)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{r.name.charAt(0)}</div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
              <div style={{ display: 'flex', gap: 1, marginLeft: 'auto', color: 'var(--amber)' }}>
                {Array.from({ length: r.stars }).map((_, i) => <Star key={i} size={11} fill="currentColor" strokeWidth={0} />)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn--ghost" onClick={openReview}>
        <Star size={16} strokeWidth={2.3} /> Déjanos tu reseña
      </button>
    </section>
  );
}
