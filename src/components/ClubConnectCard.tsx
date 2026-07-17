import { LogIn } from 'lucide-react';
import { Logo } from './Logo';

const HSC_URL = 'https://healthyspaceclub.com';

/** Conexión con Healthy Space Club — SIN login. La app de food trucks es local
 *  (solo Culiacán), así que aquí no hay detección de ubicación: la detección de
 *  Culiacán vive en HSC (internacional), para no revelar el negocio a usuarios
 *  de fuera. `compact` para el Home. */
export function ClubConnectCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="card dark-depth" style={{
      background: 'var(--forest)', color: 'var(--on-dark)',
      padding: compact ? '16px 16px' : '20px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
        <Logo variant="h" size={38} />
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 2 }}>La app de fitness</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Healthy Space Club</div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--on-dark-2)', lineHeight: 1.5 }}>
        ¿Entrenas con nosotros? Conecta tu cuenta y registra las macros de tu bowl
        automáticamente en tu plan. Y si aún no la conoces, descúbrela.
      </p>
      <button className="btn btn--gold" style={{ width: 'auto', padding: '12px 20px', marginTop: 13 }}
        onClick={() => window.open(HSC_URL, '_blank', 'noopener')}>
        <LogIn size={16} strokeWidth={2.4} /> Conectar mi Club
      </button>
    </div>
  );
}
