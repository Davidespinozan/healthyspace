import { openInstagram, openWhatsApp } from '../data/business';

/** Botones flotantes de contacto (esquina inferior derecha): Instagram + WhatsApp.
 *  `raised` los sube cuando la barra de pedido está visible, para no encimarse. */
export function SocialFabs({ raised = false }: { raised?: boolean }) {
  const bottom = raised ? 'calc(150px + var(--safe-b))' : 'calc(80px + var(--safe-b))';
  return (
    <div style={{
      position: 'fixed', right: 16, bottom, zIndex: 44,
      display: 'grid', gap: 11, transition: 'bottom .3s var(--ease)',
    }}>
      <button onClick={openInstagram} aria-label="Instagram" style={fab('linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.4" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" stroke="none" />
        </svg>
      </button>
      <button onClick={() => openWhatsApp()} aria-label="WhatsApp" style={fab('#25D366')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
          <path d="M12.04 2.5A9.5 9.5 0 0 0 4 16.86L2.5 21.5l4.77-1.25a9.5 9.5 0 1 0 4.77-17.75Zm0 17.4a7.87 7.87 0 0 1-4.01-1.1l-.29-.17-2.83.74.76-2.76-.19-.3a7.9 7.9 0 1 1 6.56 3.59Z" />
        </svg>
      </button>
    </div>
  );
}

const fab = (bg: string): React.CSSProperties => ({
  width: 48, height: 48, borderRadius: 999, background: bg,
  display: 'grid', placeItems: 'center',
  boxShadow: '0 6px 20px -4px rgba(14,37,33,.4), inset 0 1px 0 rgba(255,255,255,.25)',
  transition: 'transform .14s var(--ease)',
});
