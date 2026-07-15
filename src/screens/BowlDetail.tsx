import { useState } from 'react';
import { ChevronLeft, Heart, Minus, Plus, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { bowlById, sumMacros, ING } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';

export default function BowlDetail({ param }: { param?: string }) {
  const push = useStore((s) => s.push);
  const pop = useStore((s) => s.pop);
  const addToCart = useStore((s) => s.addToCart);
  const fav = useStore((s) => (param ? s.favorites.includes(param) : false));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const b = param ? bowlById(param) : undefined;
  if (!b) return null;
  const m = sumMacros(b.ingredients);

  const add = () => {
    addToCart({ bowlId: b.id, name: b.name, ingredients: b.ingredients, price: b.price, img: b.img }, qty);
    setAdded(true);
    setTimeout(() => push({ name: 'cart' }), 420);
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(112px + var(--safe-b))' }}>
      <div style={{ position: 'relative' }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="4/3" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,37,33,.35), transparent 34%)' }} />
        <button className="iconbtn" onClick={pop} style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top,0))', left: 16 }}><ChevronLeft size={22} /></button>
        <button className="iconbtn" onClick={() => toggleFavorite(b.id)} style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top,0))', right: 16 }} aria-label="favorito">
          <Heart size={19} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink)'} />
        </button>
      </div>

      <div style={{ padding: '20px 20px 8px', display: 'grid', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 className="h-1" style={{ flex: 1 }}>{b.name}</h1>
            <b className="tabular" style={{ fontSize: 22, color: 'var(--amber-deep)' }}>{money(b.price)}</b>
          </div>
          <p className="muted" style={{ fontSize: 14.5, marginTop: 6, lineHeight: 1.45 }}>{b.tagline}</p>
        </div>

        <div className="card" style={{ padding: '16px 18px', boxShadow: 'var(--sh-sm)' }}>
          <MacroRow m={m} />
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Qué lleva</div>
          <div style={{ display: 'grid', gap: 9 }}>
            {b.ingredients.map((id) => {
              const ing = ING[id]; if (!ing) return null;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: b.accent, flex: '0 0 auto' }} />
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>{ing.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de acción fija */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '14px 20px calc(16px + var(--safe-b))', background: 'linear-gradient(transparent, var(--cream) 22%)', display: 'flex', gap: 12, alignItems: 'center', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', borderRadius: 999, boxShadow: 'var(--sh-sm)', padding: 4 }}>
          <button className="iconbtn" style={{ boxShadow: 'none', width: 40 }} onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={18} /></button>
          <b className="tabular" style={{ minWidth: 20, textAlign: 'center', fontSize: 16 }}>{qty}</b>
          <button className="iconbtn" style={{ boxShadow: 'none', width: 40 }} onClick={() => setQty(qty + 1)}><Plus size={18} /></button>
        </div>
        <button className="btn" style={{ flex: 1 }} onClick={add} disabled={added}>
          {added ? <><Check size={18} strokeWidth={2.6} /> Agregado</> : <>Agregar · {money(b.price * qty)}</>}
        </button>
      </div>
    </div>
  );
}
