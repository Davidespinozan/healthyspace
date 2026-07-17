// Sucursales del food truck (2-5). ⚠️ Reemplaza con las reales: nombre, dirección,
// coordenadas (Google Maps → clic derecho sobre el pin → copia lat, lng) y horario.
export interface Branch {
  id: string;
  name: string;
  address: string;
  hours: string;
  openHour: number;   // 24h
  closeHour: number;
  lat: number;
  lng: number;
}

export const BRANCHES: Branch[] = [
  { id: 'las-quintas',  name: 'Las Quintas',  address: 'Blvd. Pedro Infante 2500, Las Quintas, Culiacán',  hours: 'Lun a Dom · 8:00 – 22:00', openHour: 8, closeHour: 22, lat: 24.8069, lng: -107.4108 },
  { id: 'tres-rios',    name: 'Tres Ríos',    address: 'Av. Álvaro Obregón, Tres Ríos, Culiacán',           hours: 'Lun a Dom · 8:00 – 22:00', openHour: 8, closeHour: 22, lat: 24.8250, lng: -107.4200 },
  { id: 'la-primavera', name: 'La Primavera', address: 'Blvd. El Dorado, La Primavera, Culiacán',            hours: 'Lun a Dom · 8:00 – 22:00', openHour: 8, closeHour: 22, lat: 24.7520, lng: -107.4640 },
];

export const branchById = (id?: string): Branch => BRANCHES.find((b) => b.id === id) ?? BRANCHES[0];

/** ¿Abierta ahora? (hora local del dispositivo). */
export function branchOpenNow(b: Branch, d: Date = new Date()): boolean {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= b.openHour && h < b.closeHour;
}
export function branchOpensLabel(b: Branch, d: Date = new Date()): string {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= b.closeHour) return `Abre mañana ${b.openHour}:00`;
  if (h < b.openHour) return `Abre hoy ${b.openHour}:00`;
  return '';
}

export const branchDirUrl = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;
export const branchMapUrl = (b: Branch) => `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`;
export const openBranchDirections = (b: Branch) => window.open(branchDirUrl(b), '_blank', 'noopener');
export const openBranchMap = (b: Branch) => window.open(branchMapUrl(b), '_blank', 'noopener');
