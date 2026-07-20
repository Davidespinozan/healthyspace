// Capa de métricas del food truck. Funciones PURAS sobre los pedidos: sin red, sin
// estado, sin React. Así se prueban solas y cualquier pantalla las reutiliza en vez
// de recalcular por su cuenta (que es como los números terminan sin cuadrar entre
// dos pantallas del mismo sistema).
//
// Patrón tomado de renovacell (data/metrics.ts).

export interface OrderRow {
  id: string; code: string; mode: 'pickup' | 'delivery';
  channel?: string; payment_method?: string | null; paid?: boolean;
  items: { name: string; qty: number; price?: number }[];
  total: number; branch: string | null; status: string; created_at: string;
}

export const METODOS = ['efectivo', 'transferencia', 'linea', 'clip', 'rappi', 'uber', 'didi'] as const;
export type Metodo = (typeof METODOS)[number];

export const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', linea: 'Pago en línea',
  clip: 'Clip', rappi: 'Rappi', uber: 'Uber', didi: 'Didi', sin: 'Sin registrar',
};

const dia = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
export const esVenta = (o: OrderRow) => o.status !== 'cancelado';

/** Resumen de un conjunto de pedidos. */
export function resumen(orders: OrderRow[]) {
  const v = orders.filter(esVenta);
  const total = v.reduce((s, o) => s + Number(o.total || 0), 0);
  return {
    total,
    pedidos: v.length,
    ticket: v.length ? total / v.length : 0,
    articulos: v.reduce((s, o) => s + o.items.reduce((n, i) => n + (i.qty || 0), 0), 0),
  };
}

/** Ventas por método de pago. Lo que David pidió desde el principio para cuadrar
 *  con el banco: efectivo, transferencia, línea, Clip, Rappi, Uber, Didi. */
export function porMetodo(orders: OrderRow[]): { metodo: string; total: number; n: number }[] {
  const m = new Map<string, { total: number; n: number }>();
  for (const o of orders.filter(esVenta)) {
    const k = o.payment_method || 'sin';
    const cur = m.get(k) ?? { total: 0, n: 0 };
    m.set(k, { total: cur.total + Number(o.total || 0), n: cur.n + 1 });
  }
  return [...m.entries()].map(([metodo, v]) => ({ metodo, ...v })).sort((a, b) => b.total - a.total);
}

/** Ventas por remolque. */
export function porRemolque(orders: OrderRow[]): { branch: string; total: number; n: number }[] {
  const m = new Map<string, { total: number; n: number }>();
  for (const o of orders.filter(esVenta)) {
    const k = o.branch ?? 'sin';
    const cur = m.get(k) ?? { total: 0, n: 0 };
    m.set(k, { total: cur.total + Number(o.total || 0), n: cur.n + 1 });
  }
  return [...m.entries()].map(([branch, v]) => ({ branch, ...v })).sort((a, b) => b.total - a.total);
}

/** De dónde vino: mostrador, la app o el kiosko. */
export function porCanal(orders: OrderRow[]) {
  const v = orders.filter(esVenta);
  const g = (c: string) => v.filter((o) => (o.channel ?? 'app') === c);
  return { mostrador: resumen(g('mostrador')), app: resumen(g('app')), kiosko: resumen(g('kiosko')) };
}

/** Lo más vendido, por platillo. */
export function topPlatillos(orders: OrderRow[], n = 6) {
  const m = new Map<string, { qty: number; total: number }>();
  for (const o of orders.filter(esVenta)) {
    for (const it of o.items) {
      const cur = m.get(it.name) ?? { qty: 0, total: 0 };
      m.set(it.name, { qty: cur.qty + (it.qty || 0), total: cur.total + (it.price ?? 0) * (it.qty || 0) });
    }
  }
  return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, n);
}

/** Ventas por día, para ver la tendencia. `dias` incluye hoy. */
export function porDia(orders: OrderRow[], dias = 7): { dia: string; total: number; n: number }[] {
  const hoy = new Date();
  const out: { dia: string; total: number; n: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    const k = dia(d);
    const v = orders.filter((o) => esVenta(o) && dia(o.created_at) === k);
    out.push({ dia: k, total: v.reduce((s, o) => s + Number(o.total || 0), 0), n: v.length });
  }
  return out;
}

/** Ventas de hoy contra las de ayer, en % (null si ayer fue 0). */
export function variacionVsAyer(orders: OrderRow[]): { hoy: number; ayer: number; pct: number | null } {
  const d = porDia(orders, 2);
  const ayer = d[0]?.total ?? 0, hoy = d[1]?.total ?? 0;
  return { hoy, ayer, pct: ayer > 0 ? ((hoy - ayer) / ayer) * 100 : null };
}

// ── DETECTORES: lo que requiere ACCIÓN ───────────────────────────────────────
// La diferencia entre un tablero que informa y uno que sirve. Un número no le
// dice a nadie qué hacer; "3 pedidos llevan 25 min sin avanzar" sí.

const FLUJO_FIN = ['recogido', 'entregado', 'cancelado'];

/** Pedidos que llevan demasiado tiempo sin avanzar de estado. */
export function pedidosAtorados(orders: OrderRow[], minutos = 20): (OrderRow & { min: number })[] {
  const ahora = Date.now();
  return orders
    .filter((o) => !FLUJO_FIN.includes(o.status))
    .map((o) => ({ ...o, min: Math.round((ahora - new Date(o.created_at).getTime()) / 60000) }))
    .filter((o) => o.min >= minutos)
    .sort((a, b) => b.min - a.min);
}

/** Pedidos de mostrador sin método de pago: venta cobrada que no cuadra con caja. */
export function ventasSinMetodo(orders: OrderRow[]): OrderRow[] {
  return orders.filter((o) => esVenta(o) && o.channel === 'mostrador' && !o.payment_method);
}

export interface CierreRow { branch: string; cerrado_en: string; diferencia: number; motivo: string | null }

/** Remolques con ventas en efectivo hoy y sin cierre de caja del día. */
export function cajasSinCerrar(orders: OrderRow[], cierres: CierreRow[], branches: string[]): string[] {
  const hoy = dia(new Date());
  const cerroHoy = new Set(cierres.filter((c) => dia(c.cerrado_en) === hoy).map((c) => c.branch));
  const conEfectivo = new Set(
    orders.filter((o) => esVenta(o) && o.payment_method === 'efectivo' && dia(o.created_at) === hoy)
      .map((o) => o.branch ?? ''),
  );
  return branches.filter((b) => conEfectivo.has(b) && !cerroHoy.has(b));
}

/** Arqueos que no cuadraron: el patrón importa más que el caso aislado. */
export function arqueosConDiferencia(cierres: CierreRow[], tolerancia = 1): CierreRow[] {
  return cierres.filter((c) => Math.abs(Number(c.diferencia || 0)) >= tolerancia);
}

export const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX');
