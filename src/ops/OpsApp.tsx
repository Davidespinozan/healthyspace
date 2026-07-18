import { useState } from 'react';
import { LogOut, Boxes } from 'lucide-react';
import { useOpsAuth } from './auth';
import { Login } from './Login';
import { Logo } from '../components/Logo';
import { PosOrders } from './pos/PosOrders';
import { MenuAdmin } from './admin/MenuAdmin';
import type { Staff } from './supabase';

const ROLE_LABEL = { pos: 'Punto de venta', admin: 'Administración', almacen: 'Almacén' } as const;

export default function OpsApp() {
  const { loading, staff, signIn, signOut } = useOpsAuth();

  if (loading) return <Center>Cargando…</Center>;
  if (!staff) return <Login onSignIn={signIn} />;
  if (!staff.active) return <Center>Tu cuenta está inactiva. Contacta a administración.</Center>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 11,
        padding: 'calc(12px + var(--safe-t)) 16px 12px', background: 'var(--forest)', color: 'var(--on-dark)' }}>
        <Logo size={34} />
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{ROLE_LABEL[staff.role]}</div>
          <div style={{ fontSize: 12, color: 'var(--on-dark-2)' }}>{staff.branch_id ? staff.branch_id.replace('-', ' ') : 'Todas las sucursales'} · {staff.name}</div>
        </div>
        <button className="iconbtn" onClick={signOut} aria-label="Salir" style={{ background: 'rgba(255,255,255,.1)', color: 'var(--on-dark)' }}><LogOut size={18} /></button>
      </header>

      <RoleView staff={staff} />
    </div>
  );
}

function RoleView({ staff }: { staff: Staff }) {
  // Admin: pedidos en vivo (todas las sucursales) + administración del menú.
  if (staff.role === 'admin') return <AdminView staff={staff} />;
  // POS: solo los pedidos de su sucursal.
  if (staff.role === 'pos') return <PosOrders staff={staff} />;
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '18vh 24px', textAlign: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', marginBottom: 6 }}>
        <Boxes size={28} strokeWidth={1.8} color="var(--ink-3)" />
      </div>
      <h2 className="h-2">Almacén</h2>
      <p className="muted" style={{ fontSize: 13.5, maxWidth: 260 }}>Solicitudes de producción y traslados — próximamente en la siguiente fase.</p>
    </div>
  );
}

/** Administración: pedidos en vivo y menú, en pestañas. */
function AdminView({ staff }: { staff: Staff }) {
  const [tab, setTab] = useState<'pedidos' | 'menu'>('pedidos');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', borderBottom: '1px solid var(--line)' }}>
        {(['pedidos', 'menu'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '9px 14px', fontSize: 14, fontWeight: 700, textTransform: 'capitalize',
              color: tab === t ? 'var(--forest)' : 'var(--ink-3)',
              borderBottom: `2.5px solid ${tab === t ? 'var(--forest)' : 'transparent'}`, marginBottom: -1,
            }}>
            {t === 'menu' ? 'Menú' : 'Pedidos'}
          </button>
        ))}
      </div>
      {tab === 'pedidos' ? <PosOrders staff={staff} /> : <MenuAdmin />}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 14, padding: 24, textAlign: 'center' }}>{children}</div>;
}
