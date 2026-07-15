import { ArrowRight, Heart, Plus } from 'lucide-react';
import { useStore } from '../state/store';
import { SIGNATURE_BOWLS, bowlById, sumMacros } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';

export default function Home() {
  const push = useStore((s) => s.push);
  const favorites = useStore((s) => s.favorites);
  const lastOrder = useStore((s) => s.lastOrder);
  const rec = SIGNATURE_BOWLS[0]; // recomendado (luego: por objetivo/hora)
  const favBowls = favorites.map(bowlById).filter(Boolean).slice(0, 6);

  return (
    <div className="page">
      {/* HERO cinematográfico */}
      <div style={{ position: 'relative', height: '68vh', minHeight: 460, background: 'var(--forest)' }}>
        <BowlPhoto src="/hero.jpg" accent="#C79A5A" alt="Healthy Space" radius={0} ratio="auto" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,37,33,.25) 0%, rgba(14,37,33,.1) 40%, rgba(14,37,33,.92) 100%)' }} />
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 26 }}>
          <div className="eyebrow" style={{ color: 'var(--amber)', marginBottom: 12 }}>Healthy Space · Culiacán</div>
          <h1 className="h-hero" style={{ color: 'var(--on-dark)' }}>
            Real Food.<br />Designed For<br />Your Goals.
          </h1>
          <button className="btn btn--gold" style={{ marginTop: 20 }} onClick={() => push({ name: 'menu' })}>
            Ordenar ahora <ArrowRight size={17} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div style={{ padding: '26px 20px 8px', display: 'grid', gap: 30 }}>
        {/* Último pedido */}
        {lastOrder && (
          <Section title="Tu último pedido" onAll={() => push({ name: 'menu' })} allLabel="Menú">
            <button className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, textAlign: 'left' }}
              onClick={() => push({ name: 'cart' })}>
              <div style={{ width: 62, height: 62, flex: '0 0 auto', borderRadius: 16, overflow: 'hidden' }}>
                <BowlPhoto src={lastOrder.items[0]?.img ?? ''} accent="#C79A5A" alt="" radius={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{lastOrder.items[0]?.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{lastOrder.items.length} artículo(s) · {money(lastOrder.total)}</div>
              </div>
              <span className="chip" style={{ background: 'var(--forest)', color: 'var(--on-dark)' }}>Repetir</span>
            </button>
          </Section>
        )}

        {/* Recomendado */}
        <Section title="Recomendado para ti">
          <button className="card" onClick={() => push({ name: 'bowl', param: rec.id })} style={{ textAlign: 'left', width: '100%' }}>
            <div style={{ position: 'relative' }}>
              <BowlPhoto src={rec.img} accent={rec.accent} alt={rec.name} ratio="16/10" />
              <span className="chip" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(244,241,233,.92)', color: 'var(--forest)', fontWeight: 700, boxShadow: 'var(--sh-sm)' }}>★ Más pedido</span>
            </div>
            <div style={{ padding: '15px 16px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h2 className="h-2" style={{ flex: 1 }}>{rec.name}</h2>
                <b className="tabular" style={{ fontSize: 17, color: 'var(--amber-deep)' }}>{money(rec.price)}</b>
              </div>
              <p className="muted" style={{ fontSize: 13.5, margin: '5px 0 13px', lineHeight: 1.4 }}>{rec.tagline}</p>
              <MacroRow m={sumMacros(rec.ingredients)} />
            </div>
          </button>
        </Section>

        {/* Favoritos */}
        {favBowls.length > 0 && (
          <Section title="Tus favoritos">
            <div className="hscroll" style={{ padding: '2px 0 4px' }}>
              {favBowls.map((b) => b && <FavCard key={b.id} id={b.id} />)}
            </div>
          </Section>
        )}

        {/* Menú */}
        <Section title="Signature Bowls" onAll={() => push({ name: 'menu' })} allLabel="Ver todo">
          <div style={{ display: 'grid', gap: 12 }}>
            {SIGNATURE_BOWLS.slice(0, 3).map((b) => <MenuRow key={b.id} id={b.id} />)}
          </div>
        </Section>

        {/* Build your bowl CTA */}
        <button className="card" onClick={() => push({ name: 'build' })}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', background: 'var(--forest)', color: 'var(--on-dark)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--amber)', color: 'var(--forest)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <Plus size={22} strokeWidth={2.6} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Arma tu bowl</div>
            <div style={{ fontSize: 13, color: 'var(--on-dark-2)' }}>A tu gusto, en 4 pasos</div>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function Section({ title, children, onAll, allLabel }: { title: string; children: React.ReactNode; onAll?: () => void; allLabel?: string }) {
  return (
    <section style={{ display: 'grid', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 className="h-1" style={{ flex: 1, fontSize: 21 }}>{title}</h2>
        {onAll && <button onClick={onAll} className="muted" style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>{allLabel} <ArrowRight size={14} /></button>}
      </div>
      {children}
    </section>
  );
}

function FavCard({ id }: { id: string }) {
  const push = useStore((s) => s.push);
  const b = bowlById(id)!;
  return (
    <button onClick={() => push({ name: 'bowl', param: id })}
      style={{ flex: '0 0 auto', width: 156, scrollSnapAlign: 'start', textAlign: 'left' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-md)' }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="1/1" />
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{b.name}</div>
      <div className="tabular muted" style={{ fontSize: 13 }}>{money(b.price)}</div>
    </button>
  );
}

function MenuRow({ id }: { id: string }) {
  const push = useStore((s) => s.push);
  const fav = useStore((s) => s.favorites.includes(id));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const b = bowlById(id)!;
  const m = sumMacros(b.ingredients);
  return (
    <div className="card" style={{ display: 'flex', gap: 13, padding: 11, alignItems: 'center' }}>
      <button onClick={() => push({ name: 'bowl', param: id })} style={{ width: 76, height: 76, flex: '0 0 auto', borderRadius: 15, overflow: 'hidden' }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} radius={15} />
      </button>
      <button onClick={() => push({ name: 'bowl', param: id })} style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, flex: 1 }}>{b.name}</div>
          <b className="tabular" style={{ color: 'var(--amber-deep)', fontSize: 15 }}>{money(b.price)}</b>
        </div>
        <div className="muted tabular" style={{ fontSize: 12.5, marginTop: 3 }}>{Math.round(m.kcal)} kcal · {Math.round(m.p)}g proteína</div>
      </button>
      <button className="iconbtn" style={{ boxShadow: 'none', background: 'transparent', width: 34 }} onClick={() => toggleFavorite(id)} aria-label="favorito">
        <Heart size={19} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink-3)'} />
      </button>
    </div>
  );
}
