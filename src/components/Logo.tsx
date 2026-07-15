// Isotipo de marca — el MISMO que Healthy Space Club (mismo archivo en Supabase).
const ICON_URL = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/icon-512.png';

/** Isotipo cuadrado de Healthy Space. `size` = lado en px. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src={ICON_URL}
      alt="Healthy Space"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: 'block', borderRadius: Math.round(size * 0.22) }}
    />
  );
}
