import { Home, UtensilsCrossed, ClipboardList, User } from 'lucide-react';
import { useStore, type ScreenName } from '../state/store';

const TABS: { name: ScreenName; label: string; Icon: typeof Home }[] = [
  { name: 'home', label: 'Inicio', Icon: Home },
  { name: 'menu', label: 'Menú', Icon: UtensilsCrossed },
  { name: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { name: 'perfil', label: 'Perfil', Icon: User },
];

export function TabBar() {
  const current = useStore((s) => s.stack[s.stack.length - 1].name);
  const goTab = useStore((s) => s.goTab);
  const activeOrders = useStore((s) => s.orders.filter((o) => o.status !== 'entregado' && o.status !== 'recogido').length);

  return (
    <nav className="tabbar" aria-label="Navegación">
      {TABS.map(({ name, label, Icon }) => {
        const active = current === name;
        return (
          <button key={name} className={`tab${active ? ' active' : ''}`} onClick={() => goTab(name)} aria-current={active}>
            <span className="tab-ic">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {name === 'pedidos' && activeOrders > 0 && <span className="tab-dot">{activeOrders}</span>}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
