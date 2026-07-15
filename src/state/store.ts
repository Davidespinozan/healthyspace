import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sumMacros, type Macro } from '../data/menu';

export type ScreenName = 'home' | 'menu' | 'bowl' | 'build' | 'cart' | 'checkout' | 'order';
export interface Screen { name: ScreenName; param?: string }

export interface CartItem {
  key: string;            // único por línea
  bowlId?: string;        // signature (si aplica)
  name: string;
  ingredients: string[];
  price: number;
  qty: number;
  img?: string;
}

export type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'recogido';
export interface Order {
  code: string;           // código corto para el QR (ej. HS-4821)
  items: CartItem[];
  total: number;
  pickupMin: number;      // minutos estimados
  status: OrderStatus;
  createdAt: number;
}

interface State {
  // Navegación (stack para transiciones + botón atrás)
  stack: Screen[];
  push: (s: Screen) => void;
  pop: () => void;
  reset: (s: Screen) => void;

  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'key' | 'qty'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;

  favorites: string[];    // bowlIds
  toggleFavorite: (bowlId: string) => void;
  lastOrder: Order | null;
  order: Order | null;
  placeOrder: () => void;
  advanceOrder: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const orderCode = () => 'HS-' + Math.floor(1000 + Math.random() * 9000);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      stack: [{ name: 'home' }],
      push: (s) => set((st) => ({ stack: [...st.stack, s] })),
      pop: () => set((st) => ({ stack: st.stack.length > 1 ? st.stack.slice(0, -1) : st.stack })),
      reset: (s) => set({ stack: [s] }),

      cart: [],
      addToCart: (item, qty = 1) =>
        set((st) => {
          // Mismo bowl idéntico → sube cantidad en vez de duplicar línea.
          const same = st.cart.find(
            (c) => c.bowlId === item.bowlId && c.ingredients.join() === item.ingredients.join(),
          );
          if (same) return { cart: st.cart.map((c) => (c === same ? { ...c, qty: c.qty + qty } : c)) };
          return { cart: [...st.cart, { ...item, key: uid(), qty }] };
        }),
      setQty: (key, qty) =>
        set((st) => ({
          cart: qty <= 0 ? st.cart.filter((c) => c.key !== key) : st.cart.map((c) => (c.key === key ? { ...c, qty } : c)),
        })),
      removeFromCart: (key) => set((st) => ({ cart: st.cart.filter((c) => c.key !== key) })),
      clearCart: () => set({ cart: [] }),

      favorites: [],
      toggleFavorite: (id) =>
        set((st) => ({
          favorites: st.favorites.includes(id) ? st.favorites.filter((f) => f !== id) : [...st.favorites, id],
        })),

      lastOrder: null,
      order: null,
      placeOrder: () => {
        const { cart } = get();
        if (!cart.length) return;
        const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
        const order: Order = {
          code: orderCode(), items: cart, total, pickupMin: 12,
          status: 'recibido', createdAt: Date.now(),
        };
        set({ order, lastOrder: order, cart: [], stack: [{ name: 'order' }] });
      },
      advanceOrder: () =>
        set((st) => {
          if (!st.order) return {};
          const flow: OrderStatus[] = ['recibido', 'preparando', 'listo', 'recogido'];
          const next = flow[Math.min(flow.indexOf(st.order.status) + 1, flow.length - 1)];
          const order = { ...st.order, status: next };
          return { order, lastOrder: order };
        }),
    }),
    {
      name: 'hs-store',
      partialize: (s) => ({ favorites: s.favorites, lastOrder: s.lastOrder }),
    },
  ),
);

/** Macros de una línea del carrito (o de cualquier composición). */
export const itemMacros = (ingredients: string[]): Macro => sumMacros(ingredients);
