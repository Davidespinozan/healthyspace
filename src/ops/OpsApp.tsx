import { useOpsAuth } from './auth';
import { Login } from './Login';
import { OpsShell, type Seccion } from './OpsShell';
import { PosOrders } from './pos/PosOrders';
import { PosSale } from './pos/PosSale';
import { PosCaja } from './pos/PosCaja';
import { MenuAdmin } from './admin/MenuAdmin';
import { Tablero } from './admin/Tablero';
import { Inventario } from './inventario/Inventario';
import { Traslados } from './inventario/Traslados';
import './ops.css';

export default function OpsApp() {
  const { loading, staff, signIn, signOut } = useOpsAuth();

  if (loading) return <Centro>Cargando…</Centro>;
  if (!staff) return <Login onSignIn={signIn} />;
  if (!staff.active) return <Centro>Tu cuenta está inactiva. Contacta a administración.</Centro>;

  // Cada rol entra por su puerta, con las secciones que le tocan.
  const secciones: Seccion[] =
    staff.role === 'admin'
      ? [
          { id: 'tablero', label: 'Tablero', render: (s) => <Tablero staff={s} /> },
          { id: 'pedidos', label: 'Pedidos', render: (s) => <PosOrders staff={s} /> },
          { id: 'vender', label: 'Vender', render: (s) => <PosSale staff={s} /> },
          { id: 'caja', label: 'Caja', render: (s) => <PosCaja staff={s} /> },
          { id: 'inventario', label: 'Inventario', render: (s) => <Inventario staff={s} /> },
          { id: 'almacen', label: 'Traslados', render: (s) => <Traslados staff={s} /> },
          { id: 'menu', label: 'Menú', render: () => <MenuAdmin /> },
        ]
      : staff.role === 'pos'
        ? [
            { id: 'vender', label: 'Vender', render: (s) => <PosSale staff={s} /> },
            { id: 'pedidos', label: 'Pedidos', render: (s) => <PosOrders staff={s} /> },
            { id: 'caja', label: 'Caja', render: (s) => <PosCaja staff={s} /> },
            { id: 'inventario', label: 'Inventario', render: (s) => <Inventario staff={s} /> },
            { id: 'almacen', label: 'Traslados', render: (s) => <Traslados staff={s} /> },
          ]
        : [
            { id: 'inventario', label: 'Inventario', render: (s) => <Inventario staff={s} /> },
            { id: 'almacen', label: 'Traslados', render: (s) => <Traslados staff={s} /> },
          ];

  return <OpsShell staff={staff} secciones={secciones} onSalir={signOut} />;
}


const Centro = ({ children }: { children: React.ReactNode }) =>
  <div className="ops"><div className="ops-center">{children}</div></div>;
