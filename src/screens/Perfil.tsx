import { Sparkles, Store, Bike, Bell, HelpCircle, FileText, ChevronRight, LogIn } from 'lucide-react';
import { useStore } from '../state/store';

export default function Perfil() {
  const customer = useStore((s) => s.customer);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const orders = useStore((s) => s.orders);
  const name = customer.name.trim() || 'Invitado';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="page has-tabs">
      <div className="topbar" style={{ display: 'block' }}>
        <div className="section-label">Tu cuenta</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', marginTop: 2 }}>Perfil</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 22 }}>
        {/* Identidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--forest)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24, flex: '0 0 auto' }}>{initial}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{orders.length} pedido(s) · Culiacán</div>
          </div>
        </div>

        {/* Conecta tu plan HSC */}
        <div className="card dark-depth" style={{ background: 'var(--forest)', color: 'var(--on-dark)', padding: '20px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={20} strokeWidth={2.2} color="var(--amber-l)" />
            <div style={{ fontWeight: 800, fontSize: 16 }}>Healthy Space Club</div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--on-dark-2)', lineHeight: 1.5, marginBottom: 15 }}>
            Conecta tu cuenta y registra las macros de cada bowl automáticamente en tu plan.
          </p>
          <button className="btn btn--gold" style={{ width: 'auto', padding: '13px 22px' }}>
            <LogIn size={17} strokeWidth={2.4} /> Conectar mi cuenta
          </button>
        </div>

        {/* Preferencia de entrega */}
        <section style={{ display: 'grid', gap: 11 }}>
          <div className="section-label">Entrega preferida</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PrefCard on={mode === 'pickup'} onClick={() => setMode('pickup')} Icon={Store} label="Pickup" />
            <PrefCard on={mode === 'delivery'} onClick={() => setMode('delivery')} Icon={Bike} label="Entrega" />
          </div>
        </section>

        {/* Ajustes */}
        <section style={{ display: 'grid', gap: 2 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Ajustes</div>
          <div className="card" style={{ overflow: 'hidden', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <SettingRow Icon={Bell} label="Notificaciones" />
            <hr className="hair" />
            <SettingRow Icon={HelpCircle} label="Ayuda y soporte" />
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

function SettingRow({ Icon, label }: { Icon: typeof Bell; label: string }) {
  return (
    <button style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', width: '100%', textAlign: 'left' }}>
      <Icon size={19} strokeWidth={2} color="var(--ink-2)" />
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>{label}</span>
      <ChevronRight size={18} color="var(--ink-3)" />
    </button>
  );
}
