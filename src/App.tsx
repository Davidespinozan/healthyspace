import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useStore, ROOT_TABS, cartTotals } from './state/store';
import { money } from './components/ui';
import { TabBar } from './components/TabBar';
import { BrandStage } from './components/BrandStage';
import { Toast } from './components/Toast';
import { SocialFabs } from './components/SocialFabs';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { VincularClub } from './components/VincularClub';
import { useClubSession } from './data/clubSession';
import Home from './screens/Home';
import Menu from './screens/Menu';
import Pedidos from './screens/Pedidos';
import Perfil from './screens/Perfil';
import BowlDetail from './screens/BowlDetail';
import BuildBowl from './screens/BuildBowl';
import Cart from './screens/Cart';
import Checkout from './screens/Checkout';
import Order from './screens/Order';
import Paquetes from './screens/Paquetes';

const SCREENS = {
  home: Home, menu: Menu, pedidos: Pedidos, perfil: Perfil,
  bowl: BowlDetail, build: BuildBowl, cart: Cart, checkout: Checkout, order: Order, paquetes: Paquetes,
};

export default function App() {
  const stack = useStore((s) => s.stack);
  const cart = useStore((s) => s.cart);
  const push = useStore((s) => s.push);
  const loadMenu = useStore((s) => s.loadMenu);
  const bowls = useStore((s) => s.bowls);
  const addToCart = useStore((s) => s.addToCart);
  const showToast = useStore((s) => s.showToast);
  const goTab = useStore((s) => s.goTab);
  const [vincular, setVincular] = useState(false);
  const club = useClubSession();
  const [pedirVinculo, setPedirVinculo] = useState(false);
  // Solo se ofrece si NO hay sesión. Antes salía aunque ya estuviera vinculado.
  useEffect(() => {
    if (pedirVinculo && !club.cargando) { setVincular(!club.userId); setPedirVinculo(false); }
  }, [pedirVinculo, club.cargando, club.userId]);
  // Precios y agotados vienen de administración; si falla, queda el menú estático.
  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Llegada desde el Club (?bowl=verde&from=club): el bowl se mete SOLO al carrito.
  // El socio ya lo eligió allá viendo cómo le cuadraba el día — hacerlo buscarlo otra
  // vez aquí sería perder justo lo que hace útil la integración.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('bowl');
    const ir = p.get('ir');            // 'menu' | 'build' — venir a mirar, sin bowl elegido
    if (!id && !ir) return;
    if (ir === 'menu') goTab('menu');
    else if (ir === 'build') { goTab('menu'); push({ name: 'build' }); }
    else if (id) {
      if (!bowls.length) return;       // espera a que cargue el menú
      const b = bowls.find((x) => x.id === id);
      if (b && !b.soldOut) {
        addToCart({ bowlId: b.id, name: b.name, ingredients: b.ingredients, price: b.price, img: b.img });
        showToast(`${b.name} agregado — viene de tu plan 🌿`);
      }
    }
    // Viene del Club: se le ofrece conectar su cuenta para que el pedido se
    // registre solo en su plan. Es opcional — pedir sin cuenta sigue siendo lo normal.
    if (p.get('from') === 'club') setPedirVinculo(true);
    // Limpia el parámetro para que un refresh no lo repita.
    window.history.replaceState({}, '', window.location.pathname);
  }, [bowls, addToCart, showToast, goTab, push]);
  const top = stack[stack.length - 1];
  const Screen = SCREENS[top.name];
  const depth = stack.length;

  const onTab = ROOT_TABS.includes(top.name);
  const count = cart.reduce((n, c) => n + c.qty, 0);
  const total = cartTotals(cart, 'pickup').total; // preview con descuento de paquete (sin envío)
  // Oculta la barra "Ver pedido" donde ya hay una barra de acción propia abajo
  // (detalle, armar bowl, paquetes) para que no se encimen.
  const showBar = count > 0 && !['cart', 'checkout', 'order', 'bowl', 'build', 'paquetes'].includes(top.name);

  return (
    <>
      <BrandStage />
      <div className="app">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={depth + top.name + (top.param ?? '')}
          initial={{ opacity: 0, x: onTab ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Screen param={top.param} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showBar && (
          <motion.button
            className="cartbar"
            style={{ bottom: onTab ? 'calc(84px + var(--safe-b))' : 'calc(16px + var(--safe-b))' }}
            initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => push({ name: 'cart' })}
          >
            <span className="cartbar-badge">{count}</span>
            <ShoppingBag size={18} strokeWidth={2.2} />
            <span style={{ fontWeight: 700 }}>Ver pedido</span>
            <span className="tabular" style={{ marginLeft: 'auto', fontWeight: 800 }}>{money(total)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {onTab && <SocialFabs raised={showBar} />}
      {onTab && <TabBar />}
      <PwaInstallBanner />
      {vincular && (
        <VincularClub
          onCerrar={() => setVincular(false)}
          onVinculado={() => setVincular(false)}
        />
      )}
      <Toast />
      </div>
    </>
  );
}
