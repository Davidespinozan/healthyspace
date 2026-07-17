// Detección de ubicación. NO hay login: el único cruce con Healthy Space Club y las
// promos locales se habilita solo si el dispositivo está en Culiacán (área de los
// remolques), para no afectar a clientes internacionales.

export const CULIACAN = { lat: 24.8091, lng: -107.394 };
export const CULIACAN_RADIUS_KM = 45; // cubre zona metropolitana + alrededores

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Pide la ubicación una vez (con permiso). Devuelve coords o null si se niega/no hay. */
export function getPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    );
  });
}

export const isInCuliacan = (pos: { lat: number; lng: number }): boolean =>
  haversineKm(pos, CULIACAN) <= CULIACAN_RADIUS_KM;
