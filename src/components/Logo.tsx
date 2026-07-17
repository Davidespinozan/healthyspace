// Marca. La FLAMA es el logo propio del food truck (diferenciación). La H (isotipo
// compartido con Healthy Space Club) se reserva para el bloque promocional del Club.
const FLAME_URL = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/logofuegohsc.webp';
const H_URL = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/icon-512.png';
// Wordmark "Healthy Space" — letras VERDES (transparente). Solo sobre fondo claro/dorado.
const WORDMARK_URL = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/logoletrashsc.png';

/** Wordmark de letras. `height` en px; el ancho se ajusta. Va sobre crema/blanco/dorado. */
export function Wordmark({ height = 24, className }: { height?: number; className?: string }) {
  return <img src={WORDMARK_URL} alt="Healthy Space" height={height} className={className} style={{ height, width: 'auto', display: 'block' }} />;
}

/** Logo cuadrado. `variant='flame'` (default) = food truck; `variant='h'` = Club. */
export function Logo({ size = 32, variant = 'flame', className }: { size?: number; variant?: 'flame' | 'h'; className?: string }) {
  return (
    <img
      src={variant === 'h' ? H_URL : FLAME_URL}
      alt={variant === 'h' ? 'Healthy Space Club' : 'Healthy Space'}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: 'block', borderRadius: Math.round(size * 0.22) }}
    />
  );
}
