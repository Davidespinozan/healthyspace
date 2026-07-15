import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useStore } from './state/store';
import { money } from './components/ui';
import Home from './screens/Home';
import Menu from './screens/Menu';
import BowlDetail from './screens/BowlDetail';
import BuildBowl from './screens/BuildBowl';
import Cart from './screens/Cart';
import Order from './screens/Order';

const SCREENS = { home: Home, menu: Menu, bowl: BowlDetail, build: BuildBowl, cart: Cart, checkout: Cart, order: Order };

export default function App() {
  const stack = useStore((s) => s.stack);
  const cart = useStore((s) => s.cart);
  const push = useStore((s) => s.push);
  const top = stack[stack.length - 1];
  const Screen = SCREENS[top.name];
  const depth = stack.length;

  const count = cart.reduce((n, c) => n + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const showBar = count > 0 && !['cart', 'checkout', 'order'].includes(top.name);

  return (
    <div className="app">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={depth + top.name + (top.param ?? '')}
          initial={{ opacity: 0, x: 24 }}
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
            initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }}
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
    </div>
  );
}
