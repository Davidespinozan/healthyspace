import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { PROTEINS, BASES, COMPLEMENTS, SALSAS, HUMMUS, SALSA_META, MAX_COMPLEMENTS, PROTEIN_PRICE, PROTEIN_CRAFT, EXTRA_IDS, EXTRA_PRICE, ING, sumMacros, bowlById, ingImg } from '../data/menu';
import { MacroRow, money } from '../components/ui';

export default function BuildBowl({ param }: { param?: string }) {
  const pop = useStore((s) => s.pop);
  const addToCart = useStore((s) => s.addToCart);
  const showToast = useStore((s) => s.showToast);

  // Si viene un bowl (param), se PERSONALIZA: se siembran sus componentes.
  const seed = param ? bowlById(param) : undefined;
  const seedIds = seed?.ingredients ?? [];

  const [protein, setProtein] = useState<string>(seedIds.find((i) => PROTEINS.includes(i)) ?? '');
  const [base, setBase] = useState<string>(seedIds.find((i) => BASES.includes(i)) ?? '');
  const [comps, setComps] = useState<string[]>(seedIds.filter((i) => COMPLEMENTS.includes(i)));
  const [salsa, setSalsa] = useState<string>(seedIds.find((i) => SALSAS.includes(i)) ?? '');
  const [hummus, setHummus] = useState<string>(seedIds.find((i) => HUMMUS.includes(i)) ?? '');
  const [extras, setExtras] = useState<string[]>([]);
  const [added, setAdded] = useState(false);

  const ingredients = [protein, base, ...comps, salsa, hummus, ...extras].filter(Boolean);
  const m = sumMacros(ingredients);
  const extrasCost = extras.reduce((s, id) => s + (EXTRA_PRICE[id] ?? 0), 0);
  // Personalizar mantiene el precio del signature; armar desde cero cobra por proteína.
  const price = (seed ? seed.price : (protein ? PROTEIN_PRICE[protein] : 0)) + extrasCost;
  const ready = !!protein && !!base;

  const toggleComp = (id: string) =>
    setComps((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPLEMENTS ? [...c, id] : c));
  const toggleExtra = (id: string) =>
    setExtras((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  const add = () => {
    if (!ready) return;
    addToCart({ name: seed ? `${seed.name} · a tu gusto` : 'Bowl a tu gusto', ingredients, price, img: seed?.img ?? '' });
    showToast(seed ? `${seed.name} personalizado agregado` : 'Tu bowl se agregó al pedido');
    setAdded(true);
    // Regresa (al menú/detalle) para seguir agregando; la barra flotante lleva al pedido.
    setTimeout(() => pop(), 420);
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(120px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 className="h-1" style={{ fontSize: 22 }}>{seed ? 'Personaliza tu bowl' : 'Arma tu bowl'}</h1>
      </div>

      <div style={{ padding: '4px 20px', display: 'grid', gap: 26 }}>
        <Step n={1} title="Proteína" hint="Elige 1">
          <Grid>{PROTEINS.map((id) => <Opt key={id} id={id} on={protein === id} onClick={() => setProtein(id)} priced />)}</Grid>
        </Step>
        <Step n={2} title="Base" hint="Elige 1">
          <Grid>{BASES.map((id) => <Opt key={id} id={id} on={base === id} onClick={() => setBase(id)} />)}</Grid>
        </Step>
        <Step n={3} title="Complementos" hint={`Hasta ${MAX_COMPLEMENTS} · ${comps.length}/${MAX_COMPLEMENTS}`}>
          <Grid>{COMPLEMENTS.map((id) => {
            const disabled = !comps.includes(id) && comps.length >= MAX_COMPLEMENTS;
            return <Opt key={id} id={id} on={comps.includes(id)} onClick={() => toggleComp(id)} dim={disabled} />;
          })}</Grid>
        </Step>
        <Step n={4} title="Salsa" hint="Elige 1">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {SALSAS.map((id) => <SalsaOpt key={id} id={id} on={salsa === id} onClick={() => setSalsa(salsa === id ? '' : id)} />)}
          </div>
        </Step>
        <Step n={5} title="Hummus de la casa" hint="Opcional · elige 1">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {HUMMUS.map((id) => <HummusOpt key={id} id={id} on={hummus === id} onClick={() => setHummus(hummus === id ? '' : id)} />)}
          </div>
        </Step>
        <Step n={6} title="Extras" hint="Opcional">
          <Grid>{EXTRA_IDS.map((id) => (
            <Opt key={id} id={id} on={extras.includes(id)} onClick={() => toggleExtra(id)} extra />
          ))}</Grid>
        </Step>
      </div>

      {/* Barra con macros vivas + agregar */}
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 'min(var(--maxw), 100vw)',
        padding: '12px 20px calc(14px + var(--safe-b))', background: 'linear-gradient(transparent, var(--cream) 22%)', zIndex: 20 }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--sh-lg), var(--edge)' }}>
          <div style={{ flex: 1, opacity: ready ? 1 : .4, transition: 'opacity .25s var(--ease)' }}><MacroRow m={m} /></div>
          <button className="btn" style={{ width: 'auto', padding: '14px 20px' }} onClick={add} disabled={!ready || added}>
            {added ? <><Check size={17} strokeWidth={2.6} /> Listo</> : ready ? <>Agregar · {money(price)}</> : 'Elige proteína y base'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--forest)', color: 'var(--on-dark)', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{n}</span>
        <h2 className="h-2" style={{ flex: 1 }}>{title}</h2>
        <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{hint}</span>
      </div>
      {children}
    </section>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
);

function SalsaOpt({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) {
  const ing = ING[id];
  const meta = SALSA_META[id];
  // Quita el prefijo "Salsa " y recapitaliza ("Salsa verde asada" → "Verde asada").
  const raw = (ing?.name ?? '').replace(/^Salsa\s+/i, '');
  const name = raw.charAt(0).toUpperCase() + raw.slice(1);
  return (
    <button onClick={onClick} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '4px 0' }}>
      <span style={{
        width: 58, height: 58, borderRadius: 999, position: 'relative', overflow: 'hidden',
        background: `radial-gradient(120% 120% at 32% 26%, ${meta.accent}, ${meta.accent}CC 55%, ${meta.accent}99)`,
        boxShadow: on ? `0 0 0 3px var(--cream), 0 0 0 5px ${meta.accent}` : 'var(--sh-sm), inset 0 2px 4px rgba(255,255,255,.35)',
        transition: 'box-shadow .18s var(--ease), transform .12s var(--ease)',
        transform: on ? 'scale(1.02)' : 'none',
      }}>
        {ingImg(id) && <img src={ingImg(id)} alt={ing?.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {on && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(14,37,33,.25)' }}>
          <Check size={20} strokeWidth={3} color="#fff" />
        </span>}
      </span>
      <span style={{ fontWeight: 700, fontSize: 12, textAlign: 'center', lineHeight: 1.1 }}>{name}</span>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: meta.accent }}>{meta.tag}</span>
    </button>
  );
}

function HummusOpt({ id, on, onClick }: { id: string; on: boolean; onClick: () => void }) {
  const ing = ING[id];
  const name = (ing?.name ?? '').replace(/^Hummus especial de\s+|^Hummus especial\s+/i, '');
  return (
    <button onClick={onClick} style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '1',
        boxShadow: on ? `0 0 0 3px var(--cream), 0 0 0 5px var(--amber)` : 'var(--sh-sm), var(--edge)',
        transition: 'box-shadow .18s var(--ease), transform .12s var(--ease)', transform: on ? 'scale(1.02)' : 'none',
      }}>
        <img src={ingImg(id)} alt={ing?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: 'var(--cream-2)' }} />
        {on && <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: 'var(--amber)', display: 'grid', placeItems: 'center' }}>
          <Check size={13} strokeWidth={3.2} color="var(--forest)" />
        </span>}
      </div>
      <span style={{ fontWeight: 700, fontSize: 11.5, lineHeight: 1.15, textTransform: 'capitalize' }}>{name}</span>
    </button>
  );
}

function Opt({ id, on, onClick, priced, extra, dim }: { id: string; on: boolean; onClick: () => void; priced?: boolean; extra?: boolean; dim?: boolean }) {
  const ing = ING[id];
  return (
    <button onClick={onClick} disabled={dim}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', borderRadius: 16, textAlign: 'left',
        background: on ? 'var(--forest)' : 'var(--surface)', color: on ? 'var(--on-dark)' : 'var(--ink)',
        boxShadow: on ? 'var(--sh-md), var(--edge-dark)' : 'var(--sh-sm), var(--edge)', opacity: dim ? .4 : 1,
        transition: 'transform .12s var(--ease), background .18s, box-shadow .18s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = '')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = '')}>
      {ingImg(id) && (
        <img src={ingImg(id)} alt="" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'cover', flex: '0 0 auto', background: 'var(--cream-2)' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{ing?.name}</div>
        {extra && (
          <div className="tabular" style={{ fontSize: 12, marginTop: 3, fontWeight: 700, color: on ? 'var(--amber)' : 'var(--amber-deep)' }}>
            +{money(EXTRA_PRICE[id])}
          </div>
        )}
        {priced && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span className="tabular" style={{ fontSize: 12, color: on ? 'var(--amber)' : 'var(--amber-deep)', fontWeight: 700 }}>{money(PROTEIN_PRICE[id])}</span>
            {PROTEIN_CRAFT[id] && (
              <span className="tabular" style={{
                fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
                background: on ? 'rgba(191,160,101,.22)' : 'rgba(20,48,41,.06)',
                color: on ? 'var(--amber-l)' : 'var(--ink-2)',
              }}>{PROTEIN_CRAFT[id].hours}</span>
            )}
          </div>
        )}
      </div>
      <span style={{ width: 20, height: 20, borderRadius: 999, flex: '0 0 auto', display: 'grid', placeItems: 'center',
        background: on ? 'var(--amber)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--sand)' }}>
        {on && <Check size={13} strokeWidth={3} color="var(--forest)" />}
      </span>
    </button>
  );
}
