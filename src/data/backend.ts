import { supabase } from './supabase';
import type { Order, Lead } from '../state/store';
import type { Bowl } from './menu';

// Capa de backend. TODO no bloqueante: si la red o las tablas fallan, la app
// sigue funcionando con su estado local (nunca rompe el flujo del cliente).
// Las tablas viven en el MISMO proyecto que HSC, con prefijo `truck_`.

/** Guarda el pedido en truck_orders. Fire-and-forget. */
export async function pushOrder(o: Order, customer?: { name: string; phone: string; notes: string }): Promise<void> {
  try {
    // Si vinculó su cuenta del Club, el pedido queda ligado a ella y el plan lo
    // registra solo. Si no, va anónimo — que es lo normal.
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('truck_orders').insert({
      user_id: auth?.user?.id ?? null,
      code: o.code,
      mode: o.mode,
      items: o.items,
      subtotal: o.subtotal,
      fee: o.fee,
      total: o.total,
      discount: o.discount ?? 0,
      address: o.address ?? null,
      branch: o.branch ?? null,
      sealed: o.sealed ?? false,
      customer: customer ?? null,
      status: o.status,
    });
    if (error) console.warn('[backend] pushOrder:', error.message);
  } catch (e) {
    console.warn('[backend] pushOrder fallo (se guardó local):', e);
  }
}

/** Guarda el lead en truck_leads. Fire-and-forget. */
export async function pushLead(l: Lead): Promise<void> {
  try {
    const { error } = await supabase.from('truck_leads').insert({
      name: l.name, phone: l.phone, email: l.email ?? null, source: l.source ?? 'app',
    });
    if (error) console.warn('[backend] pushLead:', error.message);
  } catch (e) {
    console.warn('[backend] pushLead fallo (se guardó local):', e);
  }
}

/**
 * Trae los bowls del menú (truck_bowls) para que precios y "agotado" se manejen
 * desde administración sin redeploy. Devuelve null si falla: la app se queda con
 * el menú estático (nunca se ve vacía).
 */
export async function fetchBowls(): Promise<Bowl[] | null> {
  try {
    const { data, error } = await supabase
      .from('truck_bowls')
      .select('id,name,tagline,price,img,accent,ingredients,sold_out,sort')
      .eq('active', true)
      .order('sort');
    if (error || !data?.length) {
      if (error) console.warn('[backend] fetchBowls:', error.message);
      return null;
    }
    return data.map((b) => ({
      id: b.id,
      name: b.name,
      tagline: b.tagline ?? '',
      price: Number(b.price),
      img: b.img ?? '',
      accent: b.accent ?? '#C75B3A',
      ingredients: Array.isArray(b.ingredients) ? (b.ingredients as string[]) : [],
      soldOut: !!b.sold_out,
    }));
  } catch (e) {
    console.warn('[backend] fetchBowls fallo (menú estático):', e);
    return null;
  }
}

/** Guarda la reserva de paquete semanal en truck_reservations. */
export async function pushReservation(r: { package: number; sealed: boolean; name: string; phone: string; notes?: string }): Promise<boolean> {
  try {
    const { error } = await supabase.from('truck_reservations').insert(r);
    if (error) { console.warn('[backend] pushReservation:', error.message); return false; }
    return true;
  } catch (e) {
    console.warn('[backend] pushReservation fallo:', e);
    return false;
  }
}
