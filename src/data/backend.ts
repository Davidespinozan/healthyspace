import { supabase } from './supabase';
import type { Order, Lead } from '../state/store';

// Capa de backend. TODO no bloqueante: si la red o las tablas fallan, la app
// sigue funcionando con su estado local (nunca rompe el flujo del cliente).
// Las tablas viven en el MISMO proyecto que HSC, con prefijo `truck_`.

/** Guarda el pedido en truck_orders. Fire-and-forget. */
export async function pushOrder(o: Order, customer?: { name: string; phone: string; notes: string }): Promise<void> {
  try {
    const { error } = await supabase.from('truck_orders').insert({
      code: o.code,
      mode: o.mode,
      items: o.items,
      subtotal: o.subtotal,
      fee: o.fee,
      total: o.total,
      address: o.address ?? null,
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
