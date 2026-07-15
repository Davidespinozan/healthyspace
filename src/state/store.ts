import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sumMacros, DELIVERY_FEE, type Macro } from '../data/menu';

// Pantallas raíz (tabs) + pantallas apiladas encima.
export type ScreenName = 'home' | 'menu' | 'pedidos' | 'perfil' | 'bowl' | 'build' | 'cart' | 'checkout' | 'order';
export const ROOT_TABS: ScreenName[] = ['home', 'menu', 'pedidos', 'perfil'];
export interface Screen { name: ScreenName; param?: string }

export type OrderMode = 'pickup' | 'delivery';

export interface CartItem {
  key: string;
  bowlId?: string;
  productId?: string;       // bebida o extra (no-bowl)
  name: string;
  ingredients: string[];
  price: number;
  qty: number;
  img?: string;
}

/** Clave de identidad de una línea (para agrupar idénticos). */
const lineKey = (i: Pick<CartItem, 'bowlId' | 'productId' | 'ingredients'>) =>
  `${i.bowlId ?? ''}|${i.productId ?? ''}|${i.ingredients.join()}`;

export type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'camino' | 'entregado' | 'recogido';
export interface Order {
  code: string;
  items: CartItem[];
  mode: OrderMode;
  subtotal: number;
  fee: number;
  total: number;
  address?: string;
  etaMin: number;
  status: OrderStatus;
  createdAt: number;
}

export interface Customer { name: string; phone: string; notes: string }
export interface Lead { name: string; phone: string; email?: string; source?: string; at: number }

interface State {
  // Navegación
  stack: Screen[];
  push: (s: Screen) => void;
  pop: () => void;
  reset: (s: Screen) => void;
  goTab: (name: ScreenName) => void;

  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'key' | 'qty'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;

  // Pedido
  mode: OrderMode;
  setMode: (m: OrderMode) => void;
  address: string;
  setAddress: (a: string) => void;
  customer: Customer;
  setCustomer: (c: Partial<Customer>) => void;
  promo: string;
  setPromo: (p: string) => void;

  favorites: string[];
  toggleFavorite: (bowlId: string) => void;

  orders: Order[];          // historial (persistido)
  order: Order | null;      // pedido activo en curso
  placeOrder: () => void;
  advanceOrder: () => void;

  // Captación de leads (promos)
  leads: Lead[];
  leadDone: boolean;        // ya se registró en este dispositivo
  addLead: (l: Omit<Lead, 'at'>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const orderCode = () => 'HS-' + Math.floor(1000 + Math.random() * 9000);

/** Flujo de estados según el modo. */
export const flowFor = (mode: OrderMode): OrderStatus[] =>
  mode === 'delivery'
    ? ['recibido', 'preparando', 'camino', 'entregado']
    : ['recibido', 'preparando', 'listo', 'recogido'];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      stack: [{ name: 'home' }],
      push: (s) => set((st) => ({ stack: [...st.stack, s] })),
      pop: () => set((st) => ({ stack: st.stack.length > 1 ? st.stack.slice(0, -1) : st.stack })),
      reset: (s) => set({ stack: [s] }),
      // Tab: si ya estás en esa raíz no hagas nada; si no, resetea el stack a esa raíz.
      goTab: (name) => set((st) => (st.stack[st.stack.length - 1].name === name ? {} : { stack: [{ name }] })),

      cart: [],
      addToCart: (item, qty = 1) =>
        set((st) => {
          const k = lineKey(item);
          const same = st.cart.find((c) => lineKey(c) === k);
          if (same) return { cart: st.cart.map((c) => (c === same ? { ...c, qty: c.qty + qty } : c)) };
          return { cart: [...st.cart, { ...item, key: uid(), qty }] };
        }),
      setQty: (key, qty) =>
        set((st) => ({
          cart: qty <= 0 ? st.cart.filter((c) => c.key !== key) : st.cart.map((c) => (c.key === key ? { ...c, qty } : c)),
        })),
      removeFromCart: (key) => set((st) => ({ cart: st.cart.filter((c) => c.key !== key) })),
      clearCart: () => set({ cart: [] }),

      mode: 'pickup',
      setMode: (m) => set({ mode: m }),
      address: '',
      setAddress: (a) => set({ address: a }),
      customer: { name: '', phone: '', notes: '' },
      setCustomer: (c) => set((st) => ({ customer: { ...st.customer, ...c } })),
      promo: '',
      setPromo: (p) => set({ promo: p }),

      favorites: [],
      toggleFavorite: (id) =>
        set((st) => ({
          favorites: st.favorites.includes(id) ? st.favorites.filter((f) => f !== id) : [...st.favorites, id],
        })),

      orders: [],
      order: null,
      placeOrder: () => {
        const { cart, mode, address } = get();
        if (!cart.length) return;
        const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
        const fee = mode === 'delivery' ? DELIVERY_FEE : 0;
        const order: Order = {
          code: orderCode(), items: cart, mode, subtotal, fee, total: subtotal + fee,
          address: mode === 'delivery' ? address : undefined,
          etaMin: mode === 'delivery' ? 32 : 12,
          status: 'recibido', createdAt: Date.now(),
        };
        set((st) => ({ order, orders: [order, ...st.orders], cart: [], stack: [{ name: 'order' }] }));
      },
      advanceOrder: () =>
        set((st) => {
          if (!st.order) return {};
          const flow = flowFor(st.order.mode);
          const next = flow[Math.min(flow.indexOf(st.order.status) + 1, flow.length - 1)];
          const order = { ...st.order, status: next };
          // reflejar en el historial
          const orders = st.orders.map((o) => (o.code === order.code ? order : o));
          return { order, orders };
        }),

      leads: [],
      leadDone: false,
      addLead: (l) => set((st) => ({ leads: [{ ...l, at: Date.now() }, ...st.leads], leadDone: true })),
    }),
    {
      name: 'hs-store',
      partialize: (s) => ({ favorites: s.favorites, orders: s.orders, customer: s.customer, mode: s.mode, address: s.address, leads: s.leads, leadDone: s.leadDone }),
    },
  ),
);

/** Macros de una línea del carrito (o de cualquier composición). */
export const itemMacros = (ingredients: string[]): Macro => sumMacros(ingredients);
