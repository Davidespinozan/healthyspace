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
  'camote':          ['Camote al horno', 90, 2, 21, 0],
  'papa':            ['Papa cambray asada', 110, 2, 20, 3],
  'feta':            ['Queso feta', 75, 4, 1, 6],
  // Hummus especiales de la casa (dips premium)
  'hummus-elote':    ['Hummus especial de elote', 75, 3, 9, 3],
  'hummus-jalapeno': ['Hummus especial de jalapeño', 70, 3, 7, 4],
  'hummus-chiles':   ['Hummus especial de chile árbol-guajillo', 75, 3, 8, 4],
  // Extras (con costo) — también en la tabla para sumar macros al personalizar
  // Los extras de proteína son POR proteína (el cliente elige cuál), no genéricos.
  'x-aguacate':      ['Extra aguacate', 120, 2, 6, 11],
  'x-pollo':         ['Extra pollo de cocción lenta', 240, 42, 0, 8],
  'x-chamberete':    ['Extra chamberete braseado', 285, 38, 1, 14],
  'x-cerdo':         ['Extra cerdo de cocción lenta', 300, 34, 1, 18],
  // Salsas — servidas en recipiente de acero
  's-chipotle':      ['Chipotle cremoso', 50, 1, 3, 4],
  's-garlic':        ['Garlic herb', 60, 0, 2, 6],
  's-cilantro':      ['Cilantro limón', 40, 0, 2, 4],
});

function mk(rows: Record<string, [string, number, number, number, number]>): Record<string, Ingredient> {
  const out: Record<string, Ingredient> = {};
  for (const [id, [name, kcal, p, c, f]] of Object.entries(rows)) out[id] = { id, name, kcal, p, c, f };
  return out;
}

// Fotos reales de ingredientes (Supabase, bucket healthyspaceclub / "INGREDIENTES BOWLS").
const ING_IMG_BASE = 'https://ltveorvqvvlyivjwxjlc.supabase.co/storage/v1/object/public/healthyspaceclub/INGREDIENTES%20BOWLS/';
const ING_IMG_FILE: Record<string, string> = {
  'pollo-lento': 'pollo-brazas.webp',
  'chamberete': 'chamberete-slow-cook-asado.webp',
  'cerdo-lento': 'cerdo-slow-cook.webp',
  'arroz-blanco': 'arroz-blanco.webp',
  'quinoa': 'quinoa.webp',
  'mix-greens': 'mix-greens.webp',
  'elote': 'elotito.webp',
  'brocoli': 'brocoli.webp',
  'cebolla': 'cebolla-curtida.webp',
  'pepino': 'pepino.webp',
  'pico': 'pico-de-gallo.webp',
  'verduras': 'verduras-asadas.webp',
  'feta': 'queso-feta.webp',
  'aguacate': 'aguacate.webp',
  'arroz-integral': 'arroz-integral.webp',
  'camote': 'camote-horneado.webp',
  'papa': 'papa.webp',
  'frijoles': 'frijoles-negros.webp',
  'hummus-elote': 'hummus-especial-de-elote.webp',
  'hummus-jalapeno': 'hummus-especial-jalapeNo.webp',
  'hummus-chiles': 'hummus-especial-de-chiles-arbolguajillo.webp',
  // Salsas con foto real
  's-chipotle': 'chipotle.webp',
  's-garlic': 'garlic-herb.webp',
  's-cilantro': 'cilantro.webp',
};

/** URL de la foto real del ingrediente, o '' si aún no hay (usa placeholder). */
export const ingImg = (id: string): string => (ING_IMG_FILE[id] ? ING_IMG_BASE + ING_IMG_FILE[id] : '');

/** Foto compuesta de un bowl armado (carpeta BOWLS/). */
const bowlImg = (file: string): string => ING_IMG_BASE + 'BOWLS/' + file;

/** Tomas de hero (escena de mesa, 16:9) para el carrusel de la portada. */
export const HERO_IMAGES: string[] = [1, 2, 3, 4, 5].map(
  (n) => ING_IMG_BASE + 'HEROS%20BOWLS/hero' + n + '.webp',
);

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
export const COMPLEMENTS = ['elote', 'aguacate', 'pico', 'cebolla', 'verduras', 'brocoli', 'camote', 'papa', 'feta', 'frijoles', 'pepino'];
export const SALSAS = ['s-chipotle', 's-garlic', 's-cilantro'];
/** Hummus especiales de la casa — su propio segmento (dips premium con foto real). */
export const HUMMUS = ['hummus-elote', 'hummus-jalapeno', 'hummus-chiles'];
export const MAX_COMPLEMENTS = 5;

/** Metadata visual de salsas — para las "salsas con foto" (círculo de color + descriptor). */
export const SALSA_META: Record<string, { tag: string; accent: string }> = {
  's-chipotle': { tag: 'Ahumada',  accent: '#C75B3A' },
  's-garlic':   { tag: 'Herbal',   accent: '#BFA065' },
  's-cilantro': { tag: 'Cítrica',  accent: '#6FA03A' },
};

/** Costo de envío a domicilio (MXN). Plano, como Anastacio. Pickup = sin costo. */
export const DELIVERY_FEE = 45;

// ── Paquetes: descuento por cantidad de bowls (compartir u meal prep) ──
// ⚠️ AJUSTA `off` a TU margen real. El descuento debe pagarlo la eficiencia del
// lote (cocinar en tanda), no tu utilidad. Conservador por default.
export interface WeeklyPackage {
  size: number;        // mínimo de bowls para el tier
  off: number;         // % de descuento sobre los bowls
}
export const PACKAGES: WeeklyPackage[] = [
  { size: 5,  off: 5 },
  { size: 10, off: 10 },
];

/** Precio según proteína (MXN). El chamberete braseado es el premium (8 h de cocción).
 *  Base, complementos y salsa incluidos. */
export const PROTEIN_PRICE: Record<string, number> = {
  'pollo-lento': 149, 'cerdo-lento': 159, 'chamberete': 179,
};

/** El oficio detrás de cada proteína — es LA diferencia de la casa, así que se muestra
 *  en la app (no se esconde). ⚠️ Ajusta horas/procesos a la receta real de cocina. */
export const PROTEIN_CRAFT: Record<string, { hours: string; method: string; story: string }> = {
  'pollo-lento': {
    hours: '6 h', method: 'Cocción lenta',
    story: 'Seis horas a baja temperatura en su propio jugo. Se termina en plancha al momento de tu pedido, para el dorado.',
  },
  'chamberete': {
    hours: '8 h', method: 'Braseado',
    story: 'Ocho horas braseado hasta que se deshace solo. Se guarda en su jugo de cocción y se regenera cuando ordenas.',
  },
  'cerdo-lento': {
    hours: '7 h', method: 'Cocción lenta',
    story: 'Siete horas de cocción lenta. Acabado rápido en parrilla para el contraste entre lo jugoso y lo crujiente.',
  },
};

/** La proteína (de cocción lenta) que lleva un bowl. */
export const proteinOf = (ingredients: string[]) => ingredients.find((i) => PROTEINS.includes(i));

// ── Bowls Signature ──────────────────────────────────────────────────────────
export interface Bowl {
  id: string;
  name: string;
  tagline: string;
  ingredients: string[];   // ids de ING (en orden de presentación)
  price: number;
  img: string;             // /bowls/<id>.jpg (foto premium, la subes)
  accent: string;          // color de acento del bowl (para el hero/detalle)
  soldOut?: boolean;       // agotado del día (se marca desde administración)
}

// ⚠️ Los 5 bowls de la casa (fotografía real). Composición inferida de las fotos —
// David confirma/ajusta ingredientes y precios reales.
export const SIGNATURE_BOWLS: Bowl[] = [
  {
    id: 'fuego', name: 'Fuego', tagline: 'Pollo a las brasas, chipotle ahumado y elote rostizado.',
    ingredients: ['pollo-lento', 'arroz-blanco', 'elote', 'pico', 'aguacate', 'hummus-elote', 's-chipotle'],
    price: 149, img: bowlImg('fuego-bowl.webp'), accent: '#C75B3A',
  },
  {
    id: 'brasa', name: 'Brasa', tagline: 'Chamberete braseado, quinoa y frescura de pepino.',
    ingredients: ['chamberete', 'quinoa', 'papa', 'pepino', 'cebolla', 'aguacate', 'hummus-chiles', 's-cilantro'],
    price: 179, img: bowlImg('brasa-bowl.webp'), accent: '#8A5A2B',
  },
  {
    id: 'humo', name: 'Humo', tagline: 'Res deshebrada braseada, ahumada y jugosa.',
    ingredients: ['chamberete', 'arroz-integral', 'papa', 'aguacate', 'cebolla', 'pico', 'hummus-chiles', 's-chipotle'],
    price: 175, img: bowlImg('humo-bowl.webp'), accent: '#7A4A2E',
  },
  {
    id: 'oro', name: 'Oro', tagline: 'Res, camote y hummus de elote. Dulce y dorado.',
    ingredients: ['chamberete', 'arroz-blanco', 'camote', 'pico', 'aguacate', 'hummus-elote'],
    price: 179, img: bowlImg('oro-bowl.webp'), accent: '#BFA065',
  },
  {
    id: 'verde', name: 'Verde', tagline: 'Pollo, brócoli y quinoa. Ligero, nunca poco.',
    ingredients: ['pollo-lento', 'quinoa', 'brocoli', 'pepino', 'aguacate', 'hummus-jalapeno', 's-cilantro'],
    price: 155, img: bowlImg('verde-bowl.webp'), accent: '#4E7A45',
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

/** Extras que se suman al bowl. La proteína extra se elige POR proteína (cada una
 *  tiene su precio y su foto real), no como un "extra de proteína" genérico.
 *  ⚠️ David: confirma los precios de las porciones extra contra tu costo real. */
export const EXTRAS: Product[] = [
  { id: 'x-aguacate',   name: 'Extra aguacate',      desc: '+120 kcal', price: 25, kcal: 120, accent: '#6B8E23', img: ingImg('aguacate') },
  { id: 'x-pollo',      name: 'Extra pollo',         desc: 'Cocción lenta · +240 kcal', price: 45, kcal: 240, accent: '#C75B3A', img: ingImg('pollo-lento') },
  { id: 'x-cerdo',      name: 'Extra cerdo',         desc: 'Cocción lenta · +300 kcal', price: 50, kcal: 300, accent: '#8A5A2B', img: ingImg('cerdo-lento') },
  { id: 'x-chamberete', name: 'Extra chamberete',    desc: 'Braseado 8 h · +285 kcal',  price: 60, kcal: 285, accent: '#7A4A2E', img: ingImg('chamberete') },
];

export const productById = (id: string): Product | undefined =>
  [...DRINKS, ...EXTRAS].find((p) => p.id === id);

/** Ids de extras (para personalizar) y su precio. */
export const EXTRA_IDS = EXTRAS.map((e) => e.id);
export const EXTRA_PRICE: Record<string, number> = Object.fromEntries(EXTRAS.map((e) => [e.id, e.price]));
