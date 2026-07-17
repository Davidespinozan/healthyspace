import { Logo } from './Logo';

const STEPS = [
  { t: 'Ordena en segundos', s: 'Elige tu bowl o ármalo a tu gusto' },
  { t: 'Paga sin fila', s: 'Apple Pay, Google Pay o tarjeta' },
  { t: 'Llega al food truck', s: 'Te avisamos cuando esté listo' },
  { t: 'Escanea y recoge', s: 'Muestra tu QR y listo' },
];

/** Marco de escritorio: fondo de marca detrás del shell móvil. Solo visible ≥1024px (CSS). */
export function BrandStage() {
  return (
    <div className="brand-stage" aria-hidden>
      <div className="brand-side brand-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <Logo size={40} />
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--on-dark-2)' }}>Culiacán</span>
        </div>
        <div className="brand-wordmark">Cocción lenta.<br />Sabor que no<br />se replica.</div>
        <p className="brand-tagline">Bowls mexicanos con proteínas de cocción lenta. Pocas, pero inolvidables.</p>
      </div>

      <div className="brand-side brand-right">
        <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.26em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 10 }}>
          Cómo funciona
        </div>
        {STEPS.map((st, i) => (
          <div key={st.t} className="brand-step">
            <span className="brand-step-num">{i + 1}</span>
            <div>
              <div className="brand-step-t">{st.t}</div>
              <div className="brand-step-s">{st.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
