import { ArrowRight, Heart, Plus, Star } from 'lucide-react';
import { useStore } from '../state/store';
import { SIGNATURE_BOWLS, bowlById, sumMacros } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';
import { Logo } from '../components/Logo';
import { Reveal } from '../components/Reveal';

export default function Home() {
  const push = useStore((s) => s.push);
  const favorites = useStore((s) => s.favorites);
  const lastOrder = useStore((s) => s.lastOrder);
  const rec = SIGNATURE_BOWLS[0];
  const favBowls = favorites.map(bowlById).filter(Boolean).slice(0, 6);

  return (
    <div className="page">
      {/* HERO cinematográfico con profundidad ambiental */}
      <div className="dark-depth" style={{ position: 'relative', height: '74vh', minHeight: 500, background: 'var(--forest)' }}>
        <BowlPhoto src="/hero.jpg" accent="#C79A5A" alt="Healthy Space" radius={0} ratio="auto" />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(180deg, rgba(8,26,22,.45) 0%, rgba(8,26,22,.12) 38%, rgba(8,26,22,.78) 80%, var(--forest-deep) 100%)' }} />

        <div style={{ position: 'absolute', zIndex: 3, left: 22, right: 22, top: 'calc(20px + var(--safe-t))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={34} />
          <span style={{ color: 'var(--on-dark)', fontWeight: 800, fontSize: 15, letterSpacing: '.01em' }}>Healthy Space</span>
        </div>

        <div style={{ position: 'absolute', zIndex: 3, left: 22, right: 22, bottom: 28 }}>
          <Reveal delay={0.05}>
            <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 14 }}>Culiacán · Comida real</div>
          </Reveal>
          <Reveal delay={0.14}>
            <h1 className="h-hero" style={{ color: 'var(--on-dark)' }}>
              Real Food.<br />Designed For<br />Your Goals.
            </h1>
          </Reveal>
          <Reveal delay={0.26}>
            <button className="btn btn--gold" style={{ marginTop: 22, width: 'auto', padding: '15px 26px' }} onClick={() => push({ name: 'menu' })}>
              Ordenar ahora <ArrowRight size={17} strokeWidth={2.6} />
            </button>
          </Reveal>
        </div>
      </div>

      <div style={{ padding: '28px 20px 8px', display: 'grid', gap: 32 }}>
        {/* Último pedido */}
        {lastOrder && (
          <Section title="Tu último pedido" onAll={() => push({ name: 'menu' })} allLabel="Menú">
            <button className="card pressable" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, textAlign: 'left' }}
              onClick={() => push({ name: 'cart' })}>
              <div className="zoomwrap" style={{ width: 62, height: 62, flex: '0 0 auto', borderRadius: 16 }}>
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
          <button className="card pressable" onClick={() => push({ name: 'bowl', param: rec.id })} style={{ textAlign: 'left', width: '100%' }}>
            <div className="zoomwrap" style={{ position: 'relative' }}>
              <BowlPhoto src={rec.img} accent={rec.accent} alt={rec.name} ratio="16/10" />
              <span className="badge" style={{ position: 'absolute', top: 12, left: 12 }}>
                <Star size={12} strokeWidth={2.6} fill="currentColor" /> Más pedido
              </span>
            </div>
            <div style={{ padding: '15px 16px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <h2 className="h-2" style={{ flex: 1 }}>{rec.name}</h2>
                <b className="price" style={{ fontSize: 18 }}>{money(rec.price)}</b>
              </div>
              <p className="muted" style={{ fontSize: 13.5, margin: '5px 0 14px', lineHeight: 1.4 }}>{rec.tagline}</p>
              <hr className="hair" style={{ marginBottom: 14 }} />
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
        <button className="card pressable dark-depth" onClick={() => push({ name: 'build' })}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', background: 'var(--forest)', color: 'var(--on-dark)', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
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
    <section style={{ display: 'grid', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <h2 className="h-1" style={{ fontSize: 21 }}>{title}</h2>
          <div className="section-line" />
        </div>
        {onAll && <button onClick={onAll} className="muted" style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>{allLabel} <ArrowRight size={14} /></button>}
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
      <div className="price muted" style={{ fontSize: 13, color: 'var(--amber-deep)' }}>{money(b.price)}</div>
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
    <div className="card pressable" style={{ display: 'flex', gap: 13, padding: 11, alignItems: 'center' }}>
      <button onClick={() => push({ name: 'bowl', param: id })} className="zoomwrap" style={{ width: 76, height: 76, flex: '0 0 auto', borderRadius: 15 }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} radius={15} />
      </button>
      <button onClick={() => push({ name: 'bowl', param: id })} style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, flex: 1, letterSpacing: '-.02em' }}>{b.name}</div>
          <b className="price" style={{ fontSize: 15 }}>{money(b.price)}</b>
        </div>
        <div className="muted tabular" style={{ fontSize: 12.5, marginTop: 3 }}>{Math.round(m.kcal)} kcal · {Math.round(m.p)}g proteína</div>
      </button>
      <button className="iconbtn" style={{ boxShadow: 'none', background: 'transparent', width: 34 }} onClick={() => toggleFavorite(id)} aria-label="favorito">
        <Heart size={19} strokeWidth={2.2} fill={fav ? 'var(--terra)' : 'none'} color={fav ? 'var(--terra)' : 'var(--ink-3)'} />
      </button>
    </div>
  );
}
