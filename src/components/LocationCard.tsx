import { Clock, Navigation, MapPin } from 'lucide-react';
import { LOCATION, openDirections, openMap } from '../data/location';

/** Tarjeta de ubicación del food truck con mini-mapa + "Cómo llegar". */
export function LocationCard({ title }: { title?: string }) {
  return (
    <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--sh-sm), var(--edge)' }}>
      <button onClick={openMap} aria-label="Abrir en el mapa" style={{ display: 'block', width: '100%' }}>
        <MiniMap />
      </button>
      <div style={{ padding: '14px 16px' }}>
        {title && <div className="section-label" style={{ marginBottom: 6 }}>{title}</div>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <MapPin size={18} strokeWidth={2.2} color="var(--terra)" style={{ flex: '0 0 auto', marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{LOCATION.name}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2, lineHeight: 1.4 }}>{LOCATION.address}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 7, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Clock size={13} /> {LOCATION.hours}
            </div>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={openDirections}>
          <Navigation size={17} strokeWidth={2.4} /> Cómo llegar
        </button>
      </div>
    </div>
  );
}

/** Mini-mapa abstracto (sin tiles externos): calles + pin dorado con pulso. */
function MiniMap() {
  return (
    <svg viewBox="0 0 400 150" width="100%" style={{ display: 'block', background: 'var(--cream-2)' }} aria-hidden>
      {/* manzana verde (parque) */}
      <rect x="26" y="86" width="96" height="46" rx="8" fill="rgba(78,122,69,.16)" />
      <rect x="292" y="18" width="86" height="42" rx="8" fill="rgba(20,48,41,.05)" />
      {/* calles */}
      <g stroke="#E1DACB" strokeWidth="12" strokeLinecap="round">
        <line x1="-10" y1="58" x2="410" y2="58" />
        <line x1="150" y1="-10" x2="150" y2="160" />
        <line x1="285" y1="-10" x2="285" y2="160" />
      </g>
      <g stroke="#EDE8DC" strokeWidth="6" strokeLinecap="round">
        <line x1="-10" y1="112" x2="410" y2="112" />
        <line x1="60" y1="-10" x2="60" y2="160" />
      </g>
      {/* pin */}
      <g transform="translate(215 62)">
        <circle r="20" fill="rgba(191,160,101,.18)">
          <animate attributeName="r" values="12;26;12" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".5;0;.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="0" cy="20" rx="7" ry="2.5" fill="rgba(14,37,33,.18)" />
        <path d="M0-20a13 13 0 0 1 13 13c0 8-13 20-13 20S-13 1-13-7A13 13 0 0 1 0-20Z" fill="#BFA065" stroke="#7C6232" strokeWidth="1" />
        <circle cy="-7" r="5" fill="#0E2521" />
      </g>
    </svg>
  );
}
