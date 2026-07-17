import { useState } from 'react';
import { Gift, Check } from 'lucide-react';
import { useStore, LOYALTY_GOAL } from '../state/store';
import { BowlGlyphMini } from './ui';

/** Tarjeta de sellos: 1 bowl gratis cada LOYALTY_GOAL pedidos. Device-local por ahora;
 *  migra a cuenta cuando exista login. `compact` para el teaser del Home. */
export function LoyaltyCard({ compact = false }: { compact?: boolean }) {
  const stamps = useStore((s) => s.stamps);
  const freeBowls = useStore((s) => s.freeBowls);
  const redeem = useStore((s) => s.redeemFreeBowl);
  const [code, setCode] = useState<string | null>(null);

  const faltan = LOYALTY_GOAL - stamps;

  if (compact) {
    return (
      <div className="dark-depth" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={iconWrap}><Gift size={20} strokeWidth={2.2} color="var(--amber-l)" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>
              {freeBowls > 0 ? `¡Tienes ${freeBowls} bowl${freeBowls > 1 ? 's' : ''} gratis!` : 'Tarjeta Healthy Space'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--on-dark-2)', marginTop: 1 }}>
              {freeBowls > 0 ? 'Canjéalo en el truck' : `${stamps}/${LOYALTY_GOAL} · te faltan ${faltan} para un bowl gratis`}
            </div>
          </div>
        </div>
        <Track stamps={stamps} />
      </div>
    );
  }

  return (
    <div className="dark-depth" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={iconWrap}><Gift size={20} strokeWidth={2.2} color="var(--amber-l)" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>Tarjeta Healthy Space</div>
          <div style={{ fontSize: 12.5, color: 'var(--on-dark-2)' }}>1 bowl gratis cada {LOYALTY_GOAL} pedidos</div>
        </div>
        <span className="tabular" style={{ fontWeight: 900, fontSize: 15, color: 'var(--amber-l)' }}>{stamps}/{LOYALTY_GOAL}</span>
      </div>

      <Track stamps={stamps} big />

      <div style={{ marginTop: 14 }}>
        {freeBowls > 0 ? (
          code ? (
            <div style={{ textAlign: 'center', background: 'var(--amber)', color: 'var(--forest)', borderRadius: 14, padding: '13px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Muéstralo en el truck</div>
              <div className="tabular" style={{ fontSize: 24, fontWeight: 900, letterSpacing: '.06em', marginTop: 2 }}>{code}</div>
            </div>
          ) : (
            <button className="btn btn--gold" onClick={() => { setCode('FREE-' + Math.floor(1000 + Math.random() * 9000)); redeem(); }}>
              <Gift size={17} strokeWidth={2.4} /> Canjear bowl gratis ({freeBowls})
            </button>
          )
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--on-dark-2)' }}>
            Te faltan <b style={{ color: 'var(--on-dark)' }}>{faltan}</b> pedidos para tu próximo bowl gratis 🌿
          </div>
        )}
      </div>
    </div>
  );
}

function Track({ stamps, big }: { stamps: number; big?: boolean }) {
  const d = big ? 26 : 18;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LOYALTY_GOAL}, 1fr)`, gap: big ? 7 : 5, marginTop: big ? 4 : 10 }}>
      {Array.from({ length: LOYALTY_GOAL }).map((_, i) => {
        const filled = i < stamps;
        return (
          <div key={i} style={{
            aspectRatio: '1', borderRadius: 999, display: 'grid', placeItems: 'center',
            background: filled ? 'var(--amber)' : 'rgba(255,255,255,.06)',
            boxShadow: filled ? 'inset 0 1px 0 rgba(255,255,255,.35)' : 'inset 0 0 0 1.4px rgba(255,255,255,.12)',
          }}>
            {filled && (big ? <BowlGlyphMini size={d - 12} color="var(--forest)" /> : <Check size={11} strokeWidth={3.2} color="var(--forest)" />)}
          </div>
        );
      })}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--forest)', color: 'var(--on-dark)', borderRadius: 'var(--r-xl)',
  padding: '18px 18px', boxShadow: 'var(--sh-lg), var(--edge-dark)',
};
const iconWrap: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 999, background: 'rgba(191,160,101,.16)',
  display: 'grid', placeItems: 'center', flex: '0 0 auto',
};
