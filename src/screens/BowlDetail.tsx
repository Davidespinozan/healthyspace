import { useState } from 'react';
import { ChevronLeft, Heart, Minus, Plus, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { bowlById, sumMacros, ING, proteinOf } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';
import { Reveal } from '../components/Reveal';
import { CraftCard } from '../components/CraftCard';

export default function BowlDetail({ param }: { param?: string }) {
  const push = useStore((s) => s.push);
  const pop = useStore((s) => s.pop);
  const addToCart = useStore((s) => s.addToCart);
  const showToast = useStore((s) => s.showToast);
  const fav = useStore((s) => (param ? s.favorites.includes(param) : false));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const b = param ? bowlById(param) : undefined;
  if (!b) return null;
  const m = sumMacros(b.ingredients);
  const prot = proteinOf(b.ingredients);

  const add = () => {
    addToCart({ bowlId: b.id, name: b.name, ingredients: b.ingredients, price: b.price, img: b.img }, qty);
    showToast(`${b.name} agregado a tu pedido`);
    setAdded(true);
    setTimeout(() => push({ name: 'cart' }), 420);
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(112px + var(--safe-b))' }}>
      <div style={{ position: 'relative' }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="4/3" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,26,22,.42), transparent 30%, transparent 72%, rgba(242,240,232,.9) 100%)' }} />
        <button className="iconbtn" onClick={pop} style={{ position: 'absolute', top: 'calc(14px + var(--safe-t))', left: 16 }}><ChevronLeft size={22} /></button>
        <button className="iconbtn" onClick={() => toggleFavorite(b.id)} style={{ position: 'absolute', top: 'calc(14px + var(--safe-t))', right: 16 }} aria-label="favorito">
          <Heart size={19} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink)'} />
        </button>
      </div>

      <div style={{ padding: '10px 20px 8px', display: 'grid', gap: 18 }}>
        <Reveal delay={0.02}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 className="h-1" style={{ flex: 1, fontSize: 28 }}>{b.name}</h1>
              <b className="price" style={{ fontSize: 24 }}>{money(b.price)}</b>
            </div>
            <p className="muted" style={{ fontSize: 14.5, marginTop: 7, lineHeight: 1.5 }}>{b.tagline}</p>
          </div>
        </Reveal>

        {/* El oficio detrás de la proteína — la razón de la textura */}
        {prot && (
          <Reveal delay={0.06}>
            <CraftCard proteinId={prot} />
          </Reveal>
        )}

        <Reveal delay={0.08}>
          <div className="card" style={{ padding: '17px 20px', boxShadow: 'var(--sh-sm), var(--edge)' }}>
            <MacroRow m={m} />
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>Qué lleva</div>
            <div style={{ display: 'grid', gap: 11 }}>
              {b.ingredients.map((id) => {
                const ing = ING[id]; if (!ing) return null;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: b.accent, flex: '0 0 auto', boxShadow: `0 0 0 4px ${b.accent}22` }} />
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{ing.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Barra de acción fija */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '14px 20px calc(16px + var(--safe-b))', background: 'linear-gradient(transparent, var(--cream) 24%)', display: 'flex', gap: 12, alignItems: 'center', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', borderRadius: 999, boxShadow: 'var(--sh-sm), var(--edge)', padding: 4 }}>
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
