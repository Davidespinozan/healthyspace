import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Logo } from './Logo';

// Invita a instalar la app (PWA) como en ekko/sala. Se muestra en móvil, si no
// está ya instalada, tras 4s, y no vuelve en 90 días si se descarta.
const DISMISSED_KEY = 'hs-pwa-dismissed-at';
const RESHOW_DAYS = 90;
const DELAY_MS = 4000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type Platform = 'ios-safari' | 'ios-chrome' | 'android' | 'other';

const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return /CriOS/.test(ua) ? 'ios-chrome' : 'ios-safari';
  }
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - new Date(raw).getTime() < RESHOW_DAYS * 864e5;
  } catch { return false; }
}
const rememberDismiss = () => { try { localStorage.setItem(DISMISSED_KEY, new Date().toISOString()); } catch { /* noop */ } };

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;
    const p = detectPlatform();
    if (p === 'other') return;
    setPlatform(p);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (p === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        if (cancelled) return;
        setPromptEvent(e as BeforeInstallPromptEvent);
        timer = setTimeout(() => !cancelled && setVisible(true), DELAY_MS);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => { cancelled = true; window.removeEventListener('beforeinstallprompt', handler); if (timer) clearTimeout(timer); };
    }
    // iOS: no hay API — se muestra la instrucción tras el delay.
    timer = setTimeout(() => !cancelled && setVisible(true), DELAY_MS);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  if (!visible) return null;

  const dismiss = () => { rememberDismiss(); setVisible(false); };
  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'dismissed') rememberDismiss();
    setPromptEvent(null);
    setVisible(false);
  };

  return (
    <div role="region" aria-label="Instalar app" style={{
      position: 'fixed', top: 'calc(10px + var(--safe-t))', left: 12, right: 12, marginInline: 'auto',
      width: 'min(460px, calc(100vw - 24px))', zIndex: 58,
      background: 'var(--surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--sh-xl), var(--edge)',
      padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12,
      animation: 'fadeUp .4s var(--ease) both',
    }}>
      <Logo size={42} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-.01em' }}>Instala Healthy Space</div>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>
          {platform === 'android' && 'Agrégala a tu inicio y ordena como una app.'}
          {platform === 'ios-safari' && (
            <>Toca <Share size={13} style={{ display: 'inline-block', verticalAlign: '-2px' }} /> y elige “Agregar a inicio”.</>
          )}
          {platform === 'ios-chrome' && 'Ábrela en Safari para agregarla a tu inicio.'}
        </div>
      </div>
      {platform === 'android' && promptEvent && (
        <button className="btn btn--gold" style={{ width: 'auto', padding: '10px 15px', fontSize: 13.5 }} onClick={install}>
          <Download size={16} strokeWidth={2.5} /> Instalar
        </button>
      )}
      <button className="iconbtn" onClick={dismiss} aria-label="Cerrar" style={{ width: 32, height: 32, boxShadow: 'none', background: 'var(--cream)' }}>
        <X size={17} />
      </button>
    </div>
  );
}
