import { ChevronLeft, Heart, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../state/store';
import { SIGNATURE_BOWLS, sumMacros } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';

export default function Menu() {
  const push = useStore((s) => s.push);
  const pop = useStore((s) => s.pop);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  return (
    <div className="page">
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 className="h-1" style={{ fontSize: 22 }}>Menú</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 16 }}>
        <button className="card" onClick={() => push({ name: 'build' })}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--forest)', color: 'var(--on-dark)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Plus size={22} strokeWidth={2.6} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Arma tu bowl</div>
            <div style={{ fontSize: 13, color: 'var(--on-dark-2)' }}>Proteína, base, complementos y salsa</div>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} />
        </button>

        <div className="eyebrow" style={{ marginTop: 6 }}>Signature Bowls</div>
        <div style={{ display: 'grid', gap: 16 }}>
          {SIGNATURE_BOWLS.map((b) => {
            const m = sumMacros(b.ingredients);
            const fav = favorites.includes(b.id);
            return (
              <div key={b.id} className="card">
                <button onClick={() => push({ name: 'bowl', param: b.id })} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                  <div style={{ position: 'relative' }}>
                    <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="16/10" />
                    <button className="iconbtn" onClick={(e) => { e.stopPropagation(); toggleFavorite(b.id); }}
                      style={{ position: 'absolute', top: 12, right: 12 }} aria-label="favorito">
                      <Heart size={18} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink-3)'} />
                    </button>
                  </div>
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <h2 className="h-2" style={{ flex: 1 }}>{b.name}</h2>
                      <b className="tabular" style={{ color: 'var(--amber-deep)', fontSize: 16 }}>{money(b.price)}</b>
                    </div>
                    <p className="muted" style={{ fontSize: 13, margin: '5px 0 12px', lineHeight: 1.4 }}>{b.tagline}</p>
                    <MacroRow m={m} />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
