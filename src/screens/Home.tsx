import { ArrowRight, Heart, Plus, Star, Bell, CalendarCheck } from 'lucide-react';
import { useStore, useBowls, useBowl } from '../state/store';
import { sumMacros } from '../data/menu';
import { BowlPhoto, MacroRow, money } from '../components/ui';
import { Logo, Wordmark } from '../components/Logo';
import { Reveal } from '../components/Reveal';
import { LeadCapture } from '../components/LeadCapture';
import { CraftRail } from '../components/CraftCard';
import { Pillars, SocialProof } from '../components/MarketingSections';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { ClubConnectCard } from '../components/ClubConnectCard';
import { HeroCarousel } from '../components/HeroCarousel';
import { PromosSection } from '../components/PromosSection';

export default function Home() {
  const push = useStore((s) => s.push);
  const goTab = useStore((s) => s.goTab);
  const favorites = useStore((s) => s.favorites);
  const orders = useStore((s) => s.orders);
  const bowls = useBowls();
  const rec = bowls[0];
  const favBowls = bowls.filter((b) => favorites.includes(b.id)).slice(0, 6);
  const lastOrder = orders[0];

  return (
    <div className="page has-tabs">
      {/* Header: flama en la esquina · wordmark + descriptor centrados · campana */}
      <header style={{ padding: 'calc(16px + var(--safe-t)) 20px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size={40} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <Wordmark height={52} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--amber-deep)' }}>Mexican Grill &amp; Bowls</span>
        </div>
        <button className="iconbtn" aria-label="Notificaciones"><Bell size={19} strokeWidth={2.1} /></button>
      </header>

      <div style={{ padding: '10px 20px 8px', display: 'grid', gap: 26 }}>

        {/* HERO card con profundidad */}
        <Reveal delay={0.08}>
          <div className="card dark-depth" style={{ position: 'relative', background: 'var(--forest)', minHeight: 300, boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
            <HeroCarousel images={bowls.map((b) => b.img)} />
            <div style={{ position: 'relative', padding: '26px 22px 24px', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="eyebrow" style={{ color: 'var(--amber-l)', marginBottom: 12 }}>Culiacán</div>
              <h1 className="h-hero" style={{ color: 'var(--on-dark)', fontSize: 'clamp(22px,6.2vw,29px)' }}>Proteínas de<br />cocción lenta.<br />Ingredientes frescos.</h1>
              <button className="btn btn--gold" style={{ marginTop: 18, width: 'auto', padding: '14px 24px' }} onClick={() => goTab('menu')}>
                Ver menú <ArrowRight size={17} strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </Reveal>

        {/* Último pedido */}
        {lastOrder && (
          <Section title="Tu último pedido" onAll={() => goTab('pedidos')} allLabel="Ver todos">
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

        {/* Bowls de la casa */}
        <Section title="Bowls de la casa" onAll={() => goTab('menu')} allLabel="Ver todo">
          <div style={{ display: 'grid', gap: 12 }}>
            {bowls.slice(0, 3).map((b) => <MenuRow key={b.id} id={b.id} />)}
          </div>
        </Section>

        {/* Arma tu bowl CTA */}
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

        {/* Reserva tu semana (paquetes meal prep) */}
        <button className="card pressable dark-depth" onClick={() => push({ name: 'paquetes' })}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 17px', background: 'var(--forest)', color: 'var(--on-dark)', boxShadow: 'var(--sh-lg), var(--edge-dark)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(191,160,101,.16)', color: 'var(--amber-l)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <CalendarCheck size={23} strokeWidth={2.1} />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Paquetes 5 o 10 bowls</div>
            <div style={{ fontSize: 12.5, color: 'var(--on-dark-2)', marginTop: 1 }}>Con descuento · para compartir o tu semana</div>
          </div>
          <ArrowRight size={20} strokeWidth={2.4} color="var(--amber-l)" />
        </button>

        {/* Promos locales */}
        <PromosSection />

        {/* Lealtad (teaser) */}
        <LoyaltyCard compact />

        {/* La tesis: proteínas de cocción lenta */}
        <Section title="La diferencia está en la cocción">
          <CraftRail />
        </Section>

        {/* Filosofía: rico primero, sano siempre */}
        <Pillars />

        {/* Prueba social */}
        <SocialProof />

        {/* Captación de leads (promos) */}
        <LeadCapture />

        {/* Club HSC — solo si la ubicación es Culiacán */}
        <ClubConnectCard compact />

        {/* Familia Healthy Space (la H = marca madre, compartida) + crédito */}
        <div style={{ display: 'grid', justifyItems: 'center', gap: 7, padding: '12px 0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: .75 }}>
            <Logo variant="h" size={22} />
            <span className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.02em' }}>Parte de Healthy Space</span>
          </div>
          <a href="https://stryvstudio.com" target="_blank" rel="noopener noreferrer"
            className="muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .55, textDecoration: 'none' }}>
            Powered by <span style={{ fontWeight: 800, color: 'var(--amber-deep)' }}>STRYV</span>
          </a>
        </div>
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
  const b = useBowl(id);
  if (!b) return null;
  return (
    <button onClick={() => push({ name: 'bowl', param: id })}
      style={{ flex: '0 0 auto', width: 156, scrollSnapAlign: 'start', textAlign: 'left' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-md)' }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} ratio="1/1" />
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{b.name}</div>
      <div className="price" style={{ fontSize: 13 }}>{money(b.price)}</div>
    </button>
  );
}

function MenuRow({ id }: { id: string }) {
  const push = useStore((s) => s.push);
  const fav = useStore((s) => s.favorites.includes(id));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const b = useBowl(id);
  if (!b) return null;
  const m = sumMacros(b.ingredients);
  return (
    <div className="card pressable" style={{ display: 'flex', gap: 13, padding: 11, alignItems: 'center' }}>
      <button onClick={() => push({ name: 'bowl', param: id })} className="zoomwrap" style={{ width: 104, height: 104, flex: '0 0 auto', borderRadius: 16 }}>
        <BowlPhoto src={b.img} accent={b.accent} alt={b.name} radius={16} />
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
