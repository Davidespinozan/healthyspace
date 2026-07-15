// Menú de Healthy Space. MVP = solo BOWLS. Cada bowl se compone de ingredientes con
// macros por porción → las macros del bowl (signature o armado) se calculan sumando,
// así el futuro logging en Healthy Space Club es directo (mismos números).

export interface Macro { kcal: number; p: number; c: number; f: number }
export interface Ingredient extends Macro { id: string; name: string }

/** Tabla única de ingredientes (macros por porción servida en el bowl). */
export const ING: Record<string, Ingredient> = mk({
  // Proteínas
  'pollo-asado':     ['Pollo asado', 230, 43, 0, 5],
  'carne-asada':     ['Carne asada', 290, 36, 0, 16],
  'salmon':          ['Salmón', 280, 34, 0, 15],
  'camaron':         ['Camarón', 180, 34, 2, 3],
  // Bases
  'arroz-blanco':    ['Arroz blanco', 205, 4, 45, 0],
  'arroz-integral':  ['Arroz integral', 215, 5, 45, 2],
  'quinoa':          ['Quinoa', 220, 8, 39, 4],
  'mix-greens':      ['Mix greens', 30, 2, 5, 0],
  // Complementos
  'frijoles':        ['Frijoles negros', 115, 8, 20, 1],
  'elote':           ['Elote rostizado', 90, 3, 19, 1],
  'pico':            ['Pico de gallo', 20, 1, 4, 0],
  'aguacate':        ['Aguacate', 120, 2, 6, 11],
  'verduras':        ['Verduras asadas', 60, 2, 10, 2],
  'brocoli':         ['Brócoli', 35, 3, 7, 0],
  'pepino':          ['Pepino', 12, 1, 3, 0],
  'cherry':          ['Tomate cherry', 20, 1, 4, 0],
  'cebolla':         ['Cebolla morada', 15, 0, 4, 0],
  // Salsas
  's-chipotle':      ['Salsa chipotle', 45, 0, 3, 4],
  's-verde':         ['Salsa verde', 20, 0, 3, 1],
  's-cilantro':      ['Salsa cilantro limón', 40, 0, 2, 4],
  's-habanero':      ['Salsa habanero', 15, 0, 3, 0],
  's-garlic':        ['Salsa garlic herb', 60, 0, 2, 6],
});

function mk(rows: Record<string, [string, number, number, number, number]>): Record<string, Ingredient> {
  const out: Record<string, Ingredient> = {};
  for (const [id, [name, kcal, p, c, f]] of Object.entries(rows)) out[id] = { id, name, kcal, p, c, f };
  return out;
}

export function sumMacros(ids: string[]): Macro {
  return ids.reduce<Macro>((m, id) => {
    const i = ING[id]; if (!i) return m;
    return { kcal: m.kcal + i.kcal, p: m.p + i.p, c: m.c + i.c, f: m.f + i.f };
  }, { kcal: 0, p: 0, c: 0, f: 0 });
}

// ── Opciones de "Build Your Bowl" ────────────────────────────────────────────
export const PROTEINS = ['pollo-asado', 'carne-asada', 'salmon', 'camaron'];
export const BASES = ['arroz-blanco', 'arroz-integral', 'quinoa', 'mix-greens'];
export const COMPLEMENTS = ['frijoles', 'elote', 'pico', 'aguacate', 'verduras', 'brocoli', 'pepino', 'cherry', 'cebolla'];
export const SALSAS = ['s-chipotle', 's-verde', 's-cilantro', 's-habanero', 's-garlic'];
export const MAX_COMPLEMENTS = 5;

/** Metadata visual de salsas — para las "salsas con foto" (círculo de color + descriptor). */
export const SALSA_META: Record<string, { tag: string; accent: string }> = {
  's-chipotle': { tag: 'Ahumada',  accent: '#C75B3A' },
  's-verde':    { tag: 'Fresca',   accent: '#4E7A45' },
  's-cilantro': { tag: 'Cítrica',  accent: '#6FA03A' },
  's-habanero': { tag: 'Picante',  accent: '#D2691E' },
  's-garlic':   { tag: 'Cremosa',  accent: '#BFA065' },
};

/** Costo de envío a domicilio (MXN). Plano, como Anastacio. Pickup = sin costo. */
export const DELIVERY_FEE = 45;

/** Precio según proteína (MXN). Camarón/salmón premium. Complementos y salsa incluidos. */
export const PROTEIN_PRICE: Record<string, number> = {
  'pollo-asado': 145, 'carne-asada': 155, 'salmon': 185, 'camaron': 175,
};

// ── Bowls Signature ──────────────────────────────────────────────────────────
export interface Bowl {
  id: string;
  name: string;
  tagline: string;
  ingredients: string[];   // ids de ING (en orden de presentación)
  price: number;
  img: string;             // /bowls/<id>.jpg (foto premium, la subes)
  accent: string;          // color de acento del bowl (para el hero/detalle)
}

export const SIGNATURE_BOWLS: Bowl[] = [
  {
    id: 'fire-chicken', name: 'Fire Chicken', tagline: 'Pollo asado, chipotle ahumado y elote rostizado.',
    ingredients: ['pollo-asado', 'arroz-blanco', 'frijoles', 'elote', 'pico', 'aguacate', 's-chipotle'],
    price: 149, img: '/bowls/fire-chicken.jpg', accent: '#C75B3A',
  },
  {
    id: 'steak-power', name: 'Steak Power', tagline: 'Carne asada, integral y verduras al carbón.',
    ingredients: ['carne-asada', 'arroz-integral', 'verduras', 'elote', 'cebolla', 'aguacate', 's-cilantro'],
    price: 169, img: '/bowls/steak-power.jpg', accent: '#8A5A2B',
  },
  {
    id: 'salmon-boost', name: 'Salmon Boost', tagline: 'Salmón, quinoa y garlic herb.',
    ingredients: ['salmon', 'quinoa', 'brocoli', 'pepino', 'cherry', 'aguacate', 's-garlic'],
    price: 189, img: '/bowls/salmon-boost.jpg', accent: '#C4703E',
  },
  {
    id: 'pacific-bowl', name: 'Pacific Bowl', tagline: 'Camarón, cilantro limón y frescura del Pacífico.',
    ingredients: ['camaron', 'arroz-blanco', 'elote', 'pepino', 'pico', 'aguacate', 's-cilantro'],
    price: 179, img: '/bowls/pacific-bowl.jpg', accent: '#3E7E8C',
  },
  {
    id: 'green-balance', name: 'Green Balance', tagline: 'Pollo, mix greens y quinoa. Ligero y lleno.',
    ingredients: ['pollo-asado', 'mix-greens', 'quinoa', 'brocoli', 'pepino', 'aguacate', 's-verde'],
    price: 149, img: '/bowls/green-balance.jpg', accent: '#4E7A45',
  },
  {
    id: 'mexican-signature', name: 'Mexican Signature', tagline: 'Carne asada, frijoles y salsa verde. Casa.',
    ingredients: ['carne-asada', 'arroz-blanco', 'frijoles', 'elote', 'pico', 'aguacate', 's-verde'],
    price: 159, img: '/bowls/mexican-signature.jpg', accent: '#B24A34',
  },
];

export const bowlById = (id: string) => SIGNATURE_BOWLS.find((b) => b.id === id);

// ── Bebidas y extras (add-ons) ───────────────────────────────────────────────
export interface Product {
  id: string; name: string; desc?: string; price: number; kcal?: number; accent: string; img: string;
}

/** Aguas frescas y bebidas naturales — el upsell principal. */
export const DRINKS: Product[] = [
  { id: 'limonada',   name: 'Limonada natural',   desc: 'Recién exprimida',      price: 45, kcal: 90,  accent: '#C6D24E', img: '/drinks/limonada.jpg' },
  { id: 'jamaica',    name: 'Agua de jamaica',    desc: 'Sin azúcar añadida',    price: 40, kcal: 55,  accent: '#9E2B4A', img: '/drinks/jamaica.jpg' },
  { id: 'horchata',   name: 'Horchata de la casa',desc: 'Cremosa, natural',      price: 45, kcal: 150, accent: '#E4D6BC', img: '/drinks/horchata.jpg' },
  { id: 'pepino',     name: 'Pepino · limón',     desc: 'Súper refrescante',     price: 40, kcal: 45,  accent: '#7FB77E', img: '/drinks/pepino.jpg' },
  { id: 'te-verde',   name: 'Té verde frío',      desc: 'Antioxidante',          price: 42, kcal: 30,  accent: '#6FA03A', img: '/drinks/te-verde.jpg' },
];

/** Extras que se suman al bowl. */
export const EXTRAS: Product[] = [
  { id: 'x-aguacate', name: 'Extra aguacate',     desc: '+120 kcal',  price: 25, kcal: 120, accent: '#6B8E23', img: '' },
  { id: 'x-proteina', name: 'Proteína extra',     desc: '+200 kcal',  price: 45, kcal: 200, accent: '#C75B3A', img: '' },
  { id: 'x-totopos',  name: 'Totopos horneados',  desc: '+150 kcal',  price: 30, kcal: 150, accent: '#D9A441', img: '' },
];

export const productById = (id: string): Product | undefined =>
  [...DRINKS, ...EXTRAS].find((p) => p.id === id);
