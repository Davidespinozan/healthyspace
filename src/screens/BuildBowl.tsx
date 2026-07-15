import { useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useStore } from '../state/store';
import { PROTEINS, BASES, COMPLEMENTS, SALSAS, MAX_COMPLEMENTS, PROTEIN_PRICE, ING, sumMacros } from '../data/menu';
import { MacroRow, money } from '../components/ui';

export default function BuildBowl() {
  const push = useStore((s) => s.push);
  const pop = useStore((s) => s.pop);
  const addToCart = useStore((s) => s.addToCart);

  const [protein, setProtein] = useState<string>('');
  const [base, setBase] = useState<string>('');
  const [comps, setComps] = useState<string[]>([]);
  const [salsa, setSalsa] = useState<string>('');
  const [added, setAdded] = useState(false);

  const ingredients = [protein, base, ...comps, salsa].filter(Boolean);
  const m = sumMacros(ingredients);
  const price = protein ? PROTEIN_PRICE[protein] : 0;
  const ready = !!protein && !!base;

  const toggleComp = (id: string) =>
    setComps((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPLEMENTS ? [...c, id] : c));

  const add = () => {
    if (!ready) return;
    addToCart({ name: 'Bowl a tu gusto', ingredients, price, img: '' });
    setAdded(true);
    setTimeout(() => push({ name: 'cart' }), 420);
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(120px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={pop}><ChevronLeft size={22} /></button>
        <h1 className="h-1" style={{ fontSize: 22 }}>Arma tu bowl</h1>
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
          <Grid>{SALSAS.map((id) => <Opt key={id} id={id} on={salsa === id} onClick={() => setSalsa(id)} />)}</Grid>
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

function Opt({ id, on, onClick, priced, dim }: { id: string; on: boolean; onClick: () => void; priced?: boolean; dim?: boolean }) {
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ing?.name}</div>
        {priced && <div className="tabular" style={{ fontSize: 12, color: on ? 'var(--amber)' : 'var(--amber-deep)', fontWeight: 700 }}>{money(PROTEIN_PRICE[id])}</div>}
      </div>
      <span style={{ width: 20, height: 20, borderRadius: 999, flex: '0 0 auto', display: 'grid', placeItems: 'center',
        background: on ? 'var(--amber)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--sand)' }}>
        {on && <Check size={13} strokeWidth={3} color="var(--forest)" />}
      </span>
    </button>
  );
}
