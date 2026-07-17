// Promociones. ⚠️ Placeholder — edita/borra según las ofertas reales del truck.
// Solo se muestran a usuarios en Culiacán (ver PromosSection): promos locales que
// no afectan a clientes internacionales.
export interface Promo {
  id: string;
  title: string;
  desc: string;
  tag: string;
  code?: string;      // si tiene, se puede copiar y aplicar en el carrito
  img: string;        // foto de fondo del cupón (reemplaza por la real de la promo)
}

// ⚠️ Imágenes placeholder (fotos de bowls). Reemplaza por las gráficas reales de cada promo.
const IMG = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/BOWLS/';

export const PROMOS: Promo[] = [
  { id: 'primer-pedido', title: '-15% en tu primer pedido', desc: 'Usa el código al pagar. Solo la primera vez.', tag: 'Nuevo', code: 'PRIMERA', img: IMG + 'fuego-bowl.webp' },
  { id: 'martes-bowl', title: '2×1 en bowls los martes', desc: 'Todos los martes, directo en el food truck.', tag: 'Martes', img: IMG + 'brasa-bowl.webp' },
  { id: 'combo-bebida', title: 'Bowl + agua fresca', desc: 'Agrega cualquier bebida natural por solo $20.', tag: 'Combo', code: 'COMBO20', img: IMG + 'verde-bowl.webp' },
];
