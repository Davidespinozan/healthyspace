import { useState } from 'react';
import { LayoutDashboard, Receipt, ShoppingCart, Banknote, UtensilsCrossed, Boxes, LogOut } from 'lucide-react';
import type { Staff } from './supabase';
import './ops.css';

/**
 * Shell del panel operativo: barra lateral + contenido.
 *
 * Reemplaza las pestañas. Con 4 secciones las pestañas se veían bien; con las que
 * faltan (inventario, almacén, reportes, equipo) se rompen. El patrón viene de
 * SALA, que tiene 20 páginas y por eso usa barra lateral desde el día uno.
 *
 * En móvil la barra se convierte en una fila de pestañas arriba, porque el POS
 * vive en un iPad y el que atiende no tiene tiempo de abrir menús.
 */
export const ICONOS = {
  tablero: LayoutDashboard, pedidos: Receipt, vender: ShoppingCart,
  caja: Banknote, menu: UtensilsCrossed, almacen: Boxes,
} as const;

export interface Seccion {
  id: keyof typeof ICONOS;
  label: string;
  render: (s: Staff) => React.ReactNode;
  /** Número en rojo: pendientes que requieren acción (pedidos activos, etc.). */
  badge?: number;
}

const ROL = { pos: 'Punto de venta', admin: 'Administración', almacen: 'Almacén' } as const;
const FLAMA = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/logofuegohsc.webp';

export function OpsShell({ staff, secciones, onSalir }: {
  staff: Staff; secciones: Seccion[]; onSalir: () => void;
}) {
  const [activa, setActiva] = useState(secciones[0].id);
  const actual = secciones.find((s) => s.id === activa) ?? secciones[0];

  return (
    <div className="ops">
      <div className="ops-shell">
        <nav className="ops-side">
          <div className="ops-side-brand">
            <img src={FLAMA} alt="" />
            <div>
              <b>Healthy Space</b>
              <span>{ROL[staff.role]}</span>
            </div>
          </div>

          <div className="ops-nav">
            {secciones.map((s) => {
              const Icono = ICONOS[s.id];
              return (
                <button key={s.id} className={`ops-nav-item${activa === s.id ? ' on' : ''}`}
                  onClick={() => setActiva(s.id)}>
                  <Icono size={17} strokeWidth={1.9} />
                  {s.label}
                  {!!s.badge && <span className="badge">{s.badge}</span>}
                </button>
              );
            })}
          </div>

          <div className="ops-side-foot">
            <div className="ops-side-user">
              <b>{staff.name ?? 'Sin nombre'}</b>
              {staff.branch_id ? staff.branch_id.replace(/-/g, ' ') : 'Todos los remolques'}
            </div>
            <button className="ops-nav-item" onClick={onSalir}>
              <LogOut size={17} strokeWidth={1.9} /> Salir
            </button>
          </div>
        </nav>

        <main className="ops-main">
          <div className="ops-wrap">{actual.render(staff)}</div>
        </main>
      </div>
    </div>
  );
}

/** Encabezado estándar de cada sección. */
export function OpsHead({ kicker, titulo, sub, children }: {
  kicker: string; titulo: string; sub?: string; children?: React.ReactNode;
}) {
  return (
    <div className="ops-head">
      <div className="ops-head-t">
        <div className="ops-kicker">{kicker}</div>
        <h1 className="ops-h1">{titulo}</h1>
        {sub && <p className="ops-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, tono }: {
  label: string; value: string | number; hint?: string; tono?: 'up' | 'down';
}) {
  return (
    <div className="ops-stat">
      <p className="ops-stat-l">{label}</p>
      <p className="ops-stat-v">{value}</p>
      {hint && <p className={`ops-stat-h${tono ? ' ' + tono : ''}`}>{hint}</p>}
    </div>
  );
}

export function Card({ titulo, icono, children }: {
  titulo?: string; icono?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="ops-card">
      {titulo && <div className="ops-card-t">{icono}{titulo}</div>}
      {children}
    </div>
  );
}

export function Barra({ label, valor, nota, pct, alerta }: {
  label: string; valor: string; nota?: string; pct: number; alerta?: boolean;
}) {
  return (
    <div className={`ops-bar${alerta ? ' alerta' : ''}`}>
      <div className="ops-bar-top">
        <span className="ops-bar-l">{label}</span>
        {nota && <span className="ops-bar-n">{nota}</span>}
        <b className="ops-bar-v">{valor}</b>
      </div>
      <div className="ops-bar-track"><div className="ops-bar-fill" style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </div>
  );
}
