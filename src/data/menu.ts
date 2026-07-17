// Menú de Healthy Space. MVP = solo BOWLS. Cada bowl se compone de ingredientes con
// macros por porción → las macros del bowl (signature o armado) se calculan sumando,
// así el futuro logging en Healthy Space Club es directo (mismos números).

export interface Macro { kcal: number; p: number; c: number; f: number }
export interface Ingredient extends Macro { id: string; name: string }

/** Tabla única de ingredientes (macros por porción servida en el bowl). */
export const ING: Record<string, Ingredient> = mk({
  // Proteínas — TODAS de cocción lenta. Es la diferencia de la casa: textura que no se
  // replica en casa. Sin salmón ni camarón (delicados, no toleran el regenerado).
  'pollo-lento':     ['Pollo de cocción lenta', 240, 42, 0, 8],
  'chamberete':      ['Chamberete braseado', 285, 38, 1, 14],
  'cerdo-lento':     ['Cerdo de cocción lenta', 300, 34, 1, 18],
  // Bases
  'arroz-blanco':    ['Arroz blanco', 205, 4, 45, 0],
  'arroz-integral':  ['Arroz integral', 215, 5, 45, 2],
  'quinoa':          ['Quinoa', 220, 8, 39, 4],
  'mix-greens':      ['Mix de greens', 30, 2, 5, 0],
  // Complementos frescos
  'frijoles':        ['Frijoles negros', 115, 8, 20, 1],
  'elote':           ['Elote rostizado', 90, 3, 19, 1],
  'pico':            ['Pico de gallo', 20, 1, 4, 0],
  'aguacate':        ['Aguacate', 120, 2, 6, 11],
  'verduras':        ['Verduras asadas', 60, 2, 10, 2],
  'brocoli':         ['Brócoli', 35, 3, 7, 0],
  'pepino':          ['Pepino', 12, 1, 3, 0],
  'cebolla':         ['Cebolla morada', 15, 0, 4, 0],
  'betabel':         ['Betabel rostizado', 45, 2, 10, 0],
  'camote':          ['Camote al horno', 90, 2, 21, 0],
  'feta':            ['Queso feta', 75, 4, 1, 6],
  'cherry':          ['Tomate cherry', 20, 1, 4, 0],
  // Salsas — servidas en recipiente de acero
  's-chipotle':      ['Chipotle cremoso', 50, 1, 3, 4],
  's-verde':         ['Salsa verde asada', 20, 0, 3, 1],
  's-ranch':         ['Jalapeño ranch', 60, 1, 2, 6],
  's-avocado':       ['Avocado lime', 55, 0, 2, 5],
  's-garlic':        ['Garlic herb', 60, 0, 2, 6],
  's-cilantro':      ['Cilantro limón', 40, 0, 2, 4],
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
// Pocas proteínas, pero inolvidables. Todas de cocción lenta.
export const PROTEINS = ['pollo-lento', 'chamberete', 'cerdo-lento'];
export const BASES = ['arroz-blanco', 'arroz-integral', 'quinoa', 'mix-greens'];
export const COMPLEMENTS = ['elote', 'aguacate', 'pico', 'cebolla', 'verduras', 'brocoli', 'betabel', 'camote', 'feta', 'frijoles', 'pepino', 'cherry'];
export const SALSAS = ['s-chipotle', 's-verde', 's-ranch', 's-avocado', 's-garlic', 's-cilantro'];
export const MAX_COMPLEMENTS = 5;

/** Metadata visual de salsas — para las "salsas con foto" (círculo de color + descriptor). */
export const SALSA_META: Record<string, { tag: string; accent: string }> = {
  's-chipotle': { tag: 'Ahumada',  accent: '#C75B3A' },
  's-verde':    { tag: 'Asada',    accent: '#4E7A45' },
  's-ranch':    { tag: 'Picante',  accent: '#8FBF5A' },
  's-avocado':  { tag: 'Cremosa',  accent: '#6B8E23' },
  's-garlic':   { tag: 'Herbal',   accent: '#BFA065' },
  's-cilantro': { tag: 'Cítrica',  accent: '#6FA03A' },
};

/** Costo de envío a domicilio (MXN). Plano, como Anastacio. Pickup = sin costo. */
export const DELIVERY_FEE = 45;

/** Precio según proteína (MXN). El chamberete braseado es el premium (8 h de cocción).
 *  Base, complementos y salsa incluidos. */
export const PROTEIN_PRICE: Record<string, number> = {
  'pollo-lento': 149, 'cerdo-lento': 159, 'chamberete': 179,
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
    id: 'fire-chicken', name: 'Fire Chicken', tagline: 'Pollo de cocción lenta, chipotle cremoso y elote rostizado.',
    ingredients: ['pollo-lento', 'arroz-blanco', 'frijoles', 'elote', 'pico', 'aguacate', 's-chipotle'],
    price: 149, img: '/bowls/fire-chicken.jpg', accent: '#C75B3A',
  },
  {
    id: 'steak-power', name: 'Steak Power', tagline: 'Chamberete braseado 8 horas. Se deshace solo.',
    ingredients: ['chamberete', 'arroz-integral', 'verduras', 'elote', 'cebolla', 'aguacate', 's-cilantro'],
    price: 179, img: '/bowls/steak-power.jpg', accent: '#8A5A2B',
  },
  {
    id: 'carnitas-bowl', name: 'Carnitas Bowl', tagline: 'Cerdo de cocción lenta, terminado en plancha.',
    ingredients: ['cerdo-lento', 'arroz-blanco', 'cebolla', 'pico', 'aguacate', 'frijoles', 's-verde'],
    price: 159, img: '/bowls/carnitas-bowl.jpg', accent: '#B5651D',
  },
  {
    id: 'mexican-signature', name: 'Mexican Signature', tagline: 'Chamberete, frijoles y salsa verde asada. La de la casa.',
    ingredients: ['chamberete', 'arroz-blanco', 'frijoles', 'elote', 'pico', 'aguacate', 's-verde'],
    price: 179, img: '/bowls/mexican-signature.jpg', accent: '#B24A34',
  },
  {
    id: 'green-balance', name: 'Green Balance', tagline: 'Pollo lento sobre greens y quinoa. Ligero, nunca poco.',
    ingredients: ['pollo-lento', 'mix-greens', 'quinoa', 'brocoli', 'pepino', 'aguacate', 's-avocado'],
    price: 155, img: '/bowls/green-balance.jpg', accent: '#4E7A45',
  },
  {
    id: 'huerto-bowl', name: 'Huerto Bowl', tagline: 'Betabel, camote y feta. Dulce, terroso y salado.',
    ingredients: ['pollo-lento', 'quinoa', 'betabel', 'camote', 'feta', 'pepino', 's-garlic'],
    price: 159, img: '/bowls/huerto-bowl.jpg', accent: '#9E2B4A',
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
