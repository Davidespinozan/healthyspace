import { Heart, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../state/store';
import { SIGNATURE_BOWLS, DRINKS, EXTRAS, sumMacros } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';
import { RevealGroup, RevealItem } from '../components/Reveal';
import { ProductRail } from '../components/ProductRail';

export default function Menu() {
  const push = useStore((s) => s.push);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  return (
    <div className="page has-tabs">
      <div className="topbar" style={{ display: 'block' }}>
        <div className="section-label">Healthy Space · Culiacán</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-.03em', marginTop: 2 }}>Menú</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 18 }}>
        <button className="card pressable dark-depth" onClick={() => push({ name: 'build' })}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--forest)', color: 'var(--on-dark)', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Plus size={22} strokeWidth={2.6} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Arma tu bowl</div>
            <div style={{ fontSize: 13, color: 'var(--on-dark-2)' }}>Proteína, base, complementos y salsa</div>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} />
        </button>

        <div style={{ marginTop: 8 }}>
          <div className="section-label">Lo mejor de la casa</div>
          <h2 className="h-1" style={{ fontSize: 22, marginTop: 4 }}>Bowls de la casa</h2>
          <div className="section-line" />
        </div>

        <RevealGroup style={{ display: 'grid', gap: 16 }}>
          {SIGNATURE_BOWLS.map((b) => {
            const m = sumMacros(b.ingredients);
            const fav = favorites.includes(b.id);
            return (
              <RevealItem key={b.id}>
                <div className="card pressable">
                  <button onClick={() => push({ name: 'bowl', param: b.id })} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                    <div className="zoomwrap" style={{ position: 'relative' }}>
                      <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="16/10" />
                      <button className="iconbtn" onClick={(e) => { e.stopPropagation(); toggleFavorite(b.id); }}
                        style={{ position: 'absolute', top: 12, right: 12 }} aria-label="favorito">
                        <Heart size={18} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink-3)'} />
                      </button>
                    </div>
                    <div style={{ padding: '15px 16px 17px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <h2 className="h-2" style={{ flex: 1 }}>{b.name}</h2>
                        <b className="price" style={{ fontSize: 17 }}>{money(b.price)}</b>
                      </div>
                      <p className="muted" style={{ fontSize: 13, margin: '5px 0 14px', lineHeight: 1.4 }}>{b.tagline}</p>
                      <hr className="hair" style={{ marginBottom: 14 }} />
                      <MacroRow m={m} />
                    </div>
                  </button>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* Bebidas */}
        <div style={{ marginTop: 10 }}>
          <div className="section-label">Aguas frescas</div>
          <h2 className="h-1" style={{ fontSize: 22, marginTop: 4 }}>Bebidas naturales</h2>
          <div className="section-line" />
        </div>
        <ProductRail products={DRINKS} />

        {/* Extras */}
        <div style={{ marginTop: 6 }}>
          <div className="section-label">Para acompañar</div>
          <h2 className="h-1" style={{ fontSize: 22, marginTop: 4 }}>Extras</h2>
          <div className="section-line" />
        </div>
        <ProductRail products={EXTRAS} />
      </div>
    </div>
  );
}
