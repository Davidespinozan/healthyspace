// Datos del negocio. ⚠️ Reemplaza WhatsApp/horario con los reales.
export const BUSINESS = {
  instagram: 'healthyspace.mx',
  whatsapp: '526670000000',            // ⚠️ número real con lada país (52) sin '+'
  googleReviewUrl: '',                 // ⚠️ pega el link de reseñas de Google
  // Horario simple (mismo todos los días). Si varía por día, lo hacemos por día.
  openHour: 8,                         // 8:00
  closeHour: 22,                       // 22:00
  hoursLabel: 'Lun a Dom · 8:00 – 22:00',
};

/** ¿Abierto ahora? (hora local del dispositivo). */
export function openNow(d: Date = new Date()): boolean {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= BUSINESS.openHour && h < BUSINESS.closeHour;
}

/** Minutos hasta abrir (si está cerrado), para "Abre en X". */
export function opensInLabel(d: Date = new Date()): string {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= BUSINESS.closeHour) return `Abre mañana ${BUSINESS.openHour}:00`;
  if (h < BUSINESS.openHour) return `Abre hoy ${BUSINESS.openHour}:00`;
  return '';
}

export const igUrl = `https://instagram.com/${BUSINESS.instagram}`;
export const waUrl = (text = 'Hola, tengo una duda sobre Healthy Space 🌿') =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

export const openInstagram = () => window.open(igUrl, '_blank', 'noopener');
export const openWhatsApp = (text?: string) => window.open(waUrl(text), '_blank', 'noopener');
