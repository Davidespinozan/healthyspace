import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sumMacros, DELIVERY_FEE, type Macro } from '../data/menu';
import { pushOrder, pushLead } from '../data/backend';
import { BRANCHES } from '../data/location';
import { PACKAGES } from '../data/menu';

// Pantallas raíz (tabs) + pantallas apiladas encima.
export type ScreenName = 'home' | 'menu' | 'pedidos' | 'perfil' | 'bowl' | 'build' | 'cart' | 'checkout' | 'order' | 'paquetes';
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
  discount: number;     // descuento por paquete (5/10 bowls)
  fee: number;
  total: number;
  address?: string;
  branch?: string;      // sucursal de recogida (pickup)
  sealed?: boolean;     // sellado al vacío (meal prep)
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
  branch: string;                 // sucursal seleccionada (id) para pickup
  setBranch: (id: string) => void;
  sealed: boolean;                // sellado al vacío (meal prep)
  setSealed: (v: boolean) => void;
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

  // Lealtad (tarjeta de sellos)
  stamps: number;           // sellos en el ciclo actual (0..LOYALTY_GOAL)
  freeBowls: number;        // recompensas ganadas sin canjear
  redeemFreeBowl: () => void;

  // Toast global
  toast: { id: number; msg: string } | null;
  showToast: (msg: string) => void;
}

/** Sellos para un bowl gratis. */
export const LOYALTY_GOAL = 10;

// ── Paquetes: descuento por cantidad de BOWLS (para compartir o meal prep) ──
/** % de descuento según cuántos bowls lleva el pedido (derivado de PACKAGES). */
export function packagePct(bowls: number): number {
  return PACKAGES.filter((p) => bowls >= p.size).reduce((m, p) => Math.max(m, p.off), 0) / 100;
}
export interface CartTotals { subtotal: number; bowls: number; pct: number; discount: number; fee: number; total: number }
/** Totales del carrito con el descuento de paquete aplicado (solo a los bowls). */
export function cartTotals(cart: CartItem[], mode: OrderMode): CartTotals {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const bowlsSubtotal = cart.reduce((s, c) => s + (c.productId ? 0 : c.price * c.qty), 0);
  const bowls = cart.reduce((n, c) => n + (c.productId ? 0 : c.qty), 0);
  const pct = packagePct(bowls);
  const discount = Math.round(bowlsSubtotal * pct);
  const fee = mode === 'delivery' ? DELIVERY_FEE : 0;
  return { subtotal, bowls, pct, discount, fee, total: subtotal - discount + fee };
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
      branch: BRANCHES[0].id,
      setBranch: (id) => set({ branch: id }),
      sealed: false,
      setSealed: (v) => set({ sealed: v }),
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
        const { cart, mode, address, customer, branch, sealed } = get();
        if (!cart.length) return;
        const t = cartTotals(cart, mode);
        const order: Order = {
          code: orderCode(), items: cart, mode, subtotal: t.subtotal, discount: t.discount, fee: t.fee, total: t.total,
          address: mode === 'delivery' ? address : undefined,
          branch: mode === 'pickup' ? branch : undefined,
          sealed,
          etaMin: mode === 'delivery' ? 32 : 12,
          status: 'recibido', createdAt: Date.now(),
        };
        const st0 = get();
        const next = st0.stamps + 1;
        const won = next >= LOYALTY_GOAL;
        set({
          order, orders: [order, ...st0.orders], cart: [], stack: [{ name: 'order' }],
          stamps: won ? next - LOYALTY_GOAL : next,
          freeBowls: won ? st0.freeBowls + 1 : st0.freeBowls,
          toast: won ? { id: Date.now(), msg: '🎉 ¡Ganaste un bowl gratis!' } : { id: Date.now(), msg: `Sello ${next}/${LOYALTY_GOAL} 🌿` },
        });
        void pushOrder(order, customer); // backend (no bloqueante)
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
      addLead: (l) => {
        const lead: Lead = { ...l, at: Date.now() };
        set((st) => ({ leads: [lead, ...st.leads], leadDone: true }));
        void pushLead(lead); // backend (no bloqueante)
      },

      stamps: 0,
      freeBowls: 0,
      redeemFreeBowl: () => set((st) => ({ freeBowls: Math.max(0, st.freeBowls - 1) })),

      toast: null,
      showToast: (msg) => set({ toast: { id: Date.now(), msg } }),
    }),
    {
      name: 'hs-store',
      partialize: (s) => ({ favorites: s.favorites, orders: s.orders, customer: s.customer, mode: s.mode, branch: s.branch, address: s.address, leads: s.leads, leadDone: s.leadDone, stamps: s.stamps, freeBowls: s.freeBowls }),
    },
  ),
);

/** Macros de una línea del carrito (o de cualquier composición). */
export const itemMacros = (ingredients: string[]): Macro => sumMacros(ingredients);
