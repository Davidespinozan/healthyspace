import { useState } from 'react';
import { LogOut, Boxes } from 'lucide-react';
import { useOpsAuth } from './auth';
import { Login } from './Login';
import { Logo } from '../components/Logo';
import { PosOrders } from './pos/PosOrders';
import { PosSale } from './pos/PosSale';
import { PosCaja } from './pos/PosCaja';
import { MenuAdmin } from './admin/MenuAdmin';
import { Tablero } from './admin/Tablero';
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
  // Cada rol entra por su puerta, con las pestañas que le tocan.
  if (staff.role === 'pos') {
    return <Tabs staff={staff} tabs={[
      { id: 'vender', label: 'Vender', render: (s) => <PosSale staff={s} /> },
      { id: 'pedidos', label: 'Pedidos', render: (s) => <PosOrders staff={s} /> },
      { id: 'caja', label: 'Caja', render: (s) => <PosCaja staff={s} /> },
    ]} />;
  }
  if (staff.role === 'admin') {
    return <Tabs staff={staff} tabs={[
      { id: 'tablero', label: 'Tablero', render: (s) => <Tablero staff={s} /> },
      { id: 'pedidos', label: 'Pedidos', render: (s) => <PosOrders staff={s} /> },
      { id: 'vender', label: 'Vender', render: (s) => <PosSale staff={s} /> },
      { id: 'caja', label: 'Caja', render: (s) => <PosCaja staff={s} /> },
      { id: 'menu', label: 'Menú', render: () => <MenuAdmin /> },
    ]} />;
  }
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

interface Tab { id: string; label: string; render: (s: Staff) => React.ReactNode }

/** Pestañas de la app operativa (qué ve cada rol lo decide RoleView). */
function Tabs({ staff, tabs }: { staff: Staff; tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', borderBottom: '1px solid var(--line)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{
              padding: '9px 14px', fontSize: 14, fontWeight: 700,
              color: active === t.id ? 'var(--forest)' : 'var(--ink-3)',
              borderBottom: `2.5px solid ${active === t.id ? 'var(--forest)' : 'transparent'}`, marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {current.render(staff)}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 14, padding: 24, textAlign: 'center' }}>{children}</div>;
}
