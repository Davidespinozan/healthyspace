import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../state/store';
import type { Product } from '../data/menu';
import { ProductPhoto, money } from './ui';

/** Carrusel horizontal de bebidas/extras con botón de agregar. */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="hscroll" style={{ padding: '2px 0 4px' }}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const addToCart = useStore((s) => s.addToCart);
  const showToast = useStore((s) => s.showToast);
  const inCart = useStore((s) => s.cart.some((c) => c.productId === p.id));
  const [added, setAdded] = useState(false);

  const add = () => {
    addToCart({ productId: p.id, name: p.name, ingredients: [], price: p.price, img: p.img });
    showToast(`Agregaste ${p.name}`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div style={{ flex: '0 0 auto', width: 128, scrollSnapAlign: 'start' }}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--sh-sm), var(--edge)' }}>
        <ProductPhoto src={p.img} accent={p.accent} alt={p.name} radius={16} ratio="1/1" />
        <button onClick={add} aria-label={`Agregar ${p.name}`}
          style={{
            position: 'absolute', bottom: 8, right: 8, width: 32, height: 32, borderRadius: 999,
            background: added || inCart ? 'var(--amber)' : 'var(--surface)', color: 'var(--forest)',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-md)', transition: 'background .2s, transform .12s var(--ease)',
          }}>
          {added || inCart ? <Check size={16} strokeWidth={3} /> : <Plus size={17} strokeWidth={2.6} />}
        </button>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 7, lineHeight: 1.2 }}>{p.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
        <span className="price" style={{ fontSize: 13 }}>{money(p.price)}</span>
        {p.kcal != null && <span className="muted tabular" style={{ fontSize: 11 }}>{p.kcal} kcal</span>}
      </div>
    </div>
  );
}
