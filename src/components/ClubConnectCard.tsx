import { useState } from 'react';
import { Sparkles, MapPin, ArrowRight, LogIn } from 'lucide-react';
import { useStore } from '../state/store';

const HSC_URL = 'https://healthyspaceclub.com';

/** Conexión con Healthy Space Club — SIN login. Se habilita solo si la ubicación
 *  es Culiacán (área de los remolques). Fuera de Culiacán no aparece (clientes
 *  internacionales). `compact` para el Home. */
export function ClubConnectCard({ compact = false }: { compact?: boolean }) {
  const geo = useStore((s) => s.geo);
  const detect = useStore((s) => s.detectCuliacan);
  const [loading, setLoading] = useState(false);

  // Fuera de Culiacán → no se muestra.
  if (geo.asked && geo.inCuliacan === false) return null;

  const activar = async () => { setLoading(true); await detect(); setLoading(false); };

  // Aún no sabemos si es Culiacán → pedir ubicación.
  if (geo.inCuliacan !== true) {
    const denied = geo.asked && geo.inCuliacan === null;
    return (
      <Shell compact>
        <Row
          Icon={MapPin}
          title={denied ? 'Activa tu ubicación' : '¿Estás en Culiacán?'}
          sub={denied ? 'La necesitamos para conectar tu Club y ver promos locales.' : 'Actívala y conecta tu Healthy Space Club + promos de Culiacán.'}
        />
        <button className="btn btn--gold" style={{ width: 'auto', padding: '12px 20px', marginTop: 13 }} onClick={activar} disabled={loading}>
          {loading ? 'Detectando…' : denied ? 'Reintentar' : 'Activar ubicación'} <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </Shell>
    );
  }

  // En Culiacán → conectar el Club.
  return (
    <Shell compact={compact}>
      <Row Icon={Sparkles} title="Healthy Space Club" sub="Conéctalo y registra las macros de tu bowl automáticamente en tu plan." badge="Culiacán" />
      <button className="btn btn--gold" style={{ width: 'auto', padding: '12px 20px', marginTop: 13 }}
        onClick={() => window.open(HSC_URL, '_blank', 'noopener')}>
        <LogIn size={16} strokeWidth={2.4} /> Conectar mi Club
      </button>
    </Shell>
  );
}

function Shell({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="card dark-depth" style={{
      background: 'var(--forest)', color: 'var(--on-dark)',
      padding: compact ? '16px 16px' : '20px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)',
    }}>{children}</div>
  );
}

function Row({ Icon, title, sub, badge }: { Icon: typeof Sparkles; title: string; sub: string; badge?: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <Icon size={20} strokeWidth={2.2} color="var(--amber-l)" />
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{title}</div>
        {badge && <span className="chip" style={{ background: 'rgba(191,160,101,.18)', color: 'var(--amber-l)', fontWeight: 700, fontSize: 11 }}>{badge}</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--on-dark-2)', lineHeight: 1.5 }}>{sub}</p>
    </>
  );
}
