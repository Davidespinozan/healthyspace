// Ubicación del food truck. ⚠️ Reemplaza con la dirección y coordenadas REALES
// (abre Google Maps, clic derecho sobre el pin → copia lat, lng).
export const LOCATION = {
  name: 'Healthy Space · Las Quintas',
  address: 'Blvd. Pedro Infante 2500, Las Quintas, Culiacán, Sin.',
  hours: 'Lun a Dom · 8:00 – 22:00',
  lat: 24.8069,
  lng: -107.4108,
};

/** Abre la ubicación en el mapa. */
export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${LOCATION.lat},${LOCATION.lng}`;
/** Abre indicaciones para llegar al truck. */
export const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${LOCATION.lat},${LOCATION.lng}`;

export const openDirections = () => window.open(dirUrl, '_blank', 'noopener');
export const openMap = () => window.open(mapUrl, '_blank', 'noopener');
