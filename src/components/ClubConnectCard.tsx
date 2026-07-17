import { LogIn } from 'lucide-react';
import { Logo } from './Logo';

const HSC_URL = 'https://healthyspaceclub.com';
// Imagen de fondo del propio Club (misma que usa HSC en sus secciones).
const HSC_BG = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/entrenamiento.webp';

/** Conexión con Healthy Space Club — SIN login. La app de food trucks es local
 *  (solo Culiacán), así que aquí no hay detección de ubicación: la detección de
 *  Culiacán vive en HSC (internacional), para no revelar el negocio a usuarios
 *  de fuera. `compact` para el Home. */
export function ClubConnectCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="card dark-depth" style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--forest)', color: 'var(--on-dark)', boxShadow: 'var(--sh-lg), var(--edge-dark)',
    }}>
      {/* Fondo del club + degradado para legibilidad */}
      <img src={HSC_BG} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, var(--forest) 38%, rgba(14,37,33,.72) 72%, rgba(14,37,33,.45))' }} />

      <div style={{ position: 'relative', padding: compact ? '16px 16px' : '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
          <Logo variant="h" size={38} />
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 2 }}>La app de fitness</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Healthy Space Club</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--on-dark-2)', lineHeight: 1.5, maxWidth: 300 }}>
          ¿Entrenas con nosotros? Conecta tu cuenta y registra las macros de tu bowl
          automáticamente en tu plan. Y si aún no la conoces, descúbrela.
        </p>
        <button className="btn btn--gold" style={{ width: 'auto', padding: '12px 20px', marginTop: 13 }}
          onClick={() => window.open(HSC_URL, '_blank', 'noopener')}>
          <LogIn size={16} strokeWidth={2.4} /> Conectar mi Club
        </button>
      </div>
    </div>
  );
}
