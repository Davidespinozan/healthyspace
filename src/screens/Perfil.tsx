import { Store, Bike, Bell, FileText, ChevronRight, Instagram, MessageCircle, Clock, Star } from 'lucide-react';
import { useStore } from '../state/store';
import { BUSINESS, openNow, opensInLabel, openInstagram, openWhatsApp } from '../data/business';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { ClubConnectCard } from '../components/ClubConnectCard';
import { useClubSession, primerNombre } from '../data/clubSession';

export default function Perfil() {
  const customer = useStore((s) => s.customer);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const orders = useStore((s) => s.orders);
  // Si vinculó su cuenta del Club, esa es su identidad — no el nombre que teclea
  // en el checkout. Antes decía "Invitado" con la sesión ya iniciada.
  const club = useClubSession();
  const name = club.nombre?.trim() || customer.name.trim() || (club.email ? primerNombre(null, club.email) : 'Invitado');
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="page has-tabs">
      <div className="topbar" style={{ display: 'block' }}>
        <div className="section-label">Tu cuenta</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', marginTop: 2 }}>Perfil</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 22 }}>
        {/* Estado de la cuenta del Club: quién está conectado y cómo salirse. */}
        {club.userId && (
          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--forest)', flex: '0 0 auto' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5 }}>Cuenta del Club conectada</div>
              <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {club.email} · tus pedidos se registran en tu plan
              </div>
            </div>
            <button onClick={() => { void club.desvincular(); }}
              style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--terra)', flex: '0 0 auto' }}>
              Desvincular
            </button>
          </div>
        )}

        {/* Identidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--forest)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24, flex: '0 0 auto' }}>{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {club.userId ? `Hola, ${primerNombre(club.nombre, club.email)}` : name}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>{orders.length} pedido(s) · Culiacán</div>
          </div>
        </div>

        {/* Lealtad */}
        <LoyaltyCard />

        {/* Conecta tu Club HSC — solo si la ubicación es Culiacán */}
        <ClubConnectCard />

        {/* Preferencia de entrega */}
        <section style={{ display: 'grid', gap: 11 }}>
          <div className="section-label">Entrega preferida</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PrefCard on={mode === 'pickup'} onClick={() => setMode('pickup')} Icon={Store} label="Pickup" />
            <PrefCard on={mode === 'delivery'} onClick={() => setMode('delivery')} Icon={Bike} label="Entrega" />
          </div>
        </section>

        {/* Negocio: horario + contacto */}
        <section style={{ display: 'grid', gap: 2 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Healthy Space</div>
          <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px' }}>
              <Clock size={19} strokeWidth={2} color="var(--ink-2)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>Horario</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{BUSINESS.hoursLabel}</div>
              </div>
              <span className="chip" style={{
                background: openNow() ? 'rgba(78,122,69,.14)' : 'rgba(199,91,58,.12)',
                color: openNow() ? '#3F6B39' : 'var(--terra)', fontWeight: 700,
              }}>{openNow() ? 'Abierto' : opensInLabel() || 'Cerrado'}</span>
            </div>
            <hr className="hair" />
            <SettingRow Icon={Instagram} label={`@${BUSINESS.instagram}`} sub="Síguenos" onClick={openInstagram} />
            <hr className="hair" />
            <SettingRow Icon={MessageCircle} label="Ayuda por WhatsApp" onClick={() => openWhatsApp()} />
            {BUSINESS.googleReviewUrl && (
              <>
                <hr className="hair" />
                <SettingRow Icon={Star} label="Déjanos una reseña" onClick={() => window.open(BUSINESS.googleReviewUrl, '_blank', 'noopener')} />
              </>
            )}
          </div>
        </section>

        {/* Ajustes */}
        <section style={{ display: 'grid', gap: 2 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Ajustes</div>
          <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <SettingRow Icon={Bell} label="Notificaciones" />
            <hr className="hair" />
            <SettingRow Icon={FileText} label="Términos y privacidad" />
          </div>
        </section>

        <div className="muted" style={{ textAlign: 'center', fontSize: 11.5, letterSpacing: '.06em' }}>Healthy Space · Culiacán · v0.1</div>
      </div>
    </div>
  );
}

function PrefCard({ on, onClick, Icon, label }: { on: boolean; onClick: () => void; Icon: typeof Store; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '15px 16px', borderRadius: 16,
      background: on ? 'var(--forest)' : 'var(--surface)', color: on ? 'var(--on-dark)' : 'var(--ink)',
      boxShadow: on ? 'var(--sh-md), var(--edge-dark)' : 'var(--sh-sm), var(--edge)', transition: 'background .2s, box-shadow .2s',
    }}>
      <Icon size={20} strokeWidth={2.1} color={on ? 'var(--amber-l)' : 'var(--ink-2)'} />
      <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
    </button>
  );
}

function SettingRow({ Icon, label, sub, onClick }: { Icon: typeof Bell; label: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', width: '100%', textAlign: 'left' }}>
      <Icon size={19} strokeWidth={2} color="var(--ink-2)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</div>
        {sub && <div className="muted" style={{ fontSize: 12.5 }}>{sub}</div>}
      </div>
      <ChevronRight size={18} color="var(--ink-3)" />
    </button>
  );
}
