'use strict';

/**
 * Spending taxonomy used by the 50/30/20 analysis.
 * Order matters: the first category whose keywords match wins, so the most
 * specific ones (savings, debt, subscriptions) come first.
 */

const BUCKETS = Object.freeze({
  NEEDS: 'needs',
  WANTS: 'wants',
  SAVINGS: 'savings',
  UNCLASSIFIED: 'unclassified',
});

const CATEGORY_DEFINITIONS = [
  {
    id: 'savings',
    bucket: BUCKETS.SAVINGS,
    keywords: ['ahorro', 'deposito', 'plazo fijo', 'fondo mutuo', 'fondo de emergencia', 'inversion'],
  },
  {
    id: 'debt',
    bucket: BUCKETS.NEEDS,
    keywords: ['tarjeta de credito', 'prestamo', 'cuota prestamo', 'credito', 'mora'],
  },
  {
    id: 'subscriptions',
    bucket: BUCKETS.WANTS,
    keywords: [
      'netflix', 'spotify', 'disney', 'hbo', 'max', 'amazon prime', 'prime video',
      'youtube premium', 'icloud', 'chatgpt', 'apple music', 'deezer', 'crunchyroll',
    ],
  },
  {
    id: 'education',
    bucket: BUCKETS.NEEDS,
    keywords: ['universidad', 'usil', 'utp', 'upc', 'idat', 'curso', 'udemy', 'coursera', 'libro', 'matricula'],
  },
  {
    id: 'health',
    bucket: BUCKETS.NEEDS,
    keywords: ['inkafarma', 'mifarma', 'farmacia', 'clinica', 'doctor', 'consulta', 'medico', 'seguro'],
  },
  {
    id: 'housing',
    bucket: BUCKETS.NEEDS,
    keywords: ['alquiler', 'renta', 'arriendo', 'hipoteca'],
  },
  {
    id: 'utilities',
    bucket: BUCKETS.NEEDS,
    keywords: ['luz del sur', 'enel', 'sedapal', 'electricidad', 'calidda', 'movistar', 'claro', 'entel', 'bitel', 'internet', 'agua'],
  },
  {
    id: 'transport',
    bucket: BUCKETS.NEEDS,
    keywords: ['uber', 'cabify', 'indriver', 'metropolitano', 'tren', 'pasaje', 'combustible', 'gasolina', 'grifo', 'primax', 'repsol', 'peaje', 'taxi', 'bus'],
  },
  {
    id: 'shopping',
    bucket: BUCKETS.WANTS,
    keywords: ['saga', 'ripley', 'oechsle', 'falabella', 'mercadolibre', 'mercado libre', 'amazon', 'aliexpress', 'shein', 'temu', 'zara', 'h&m', 'ropa', 'zapatillas'],
  },
  {
    id: 'entertainment',
    bucket: BUCKETS.WANTS,
    keywords: ['cineplanet', 'cinemark', 'cine', 'entrada', 'entradas', 'concierto', 'steam', 'playstation', 'xbox', 'juego', 'karaoke', 'evento'],
  },
  {
    id: 'dining_out',
    bucket: BUCKETS.WANTS,
    keywords: [
      'rappi', 'pedidosya', 'pedidos ya', 'glovo', 'delivery', 'kfc', 'bembos', 'mcdonald', 'burger king',
      'starbucks', 'restaurante', 'pollo', 'polleria', 'pizza', 'cafe', 'chifa', 'cevicheria', 'bar', 'pub', 'discoteca',
    ],
  },
  {
    id: 'basic_food',
    bucket: BUCKETS.NEEDS,
    keywords: ['wong', 'plaza vea', 'tottus', 'metro', 'vivanda', 'mercado', 'bodega', 'supermercado', 'minimarket', 'menu', 'almuerzo'],
  },
];

const OTHER = Object.freeze({ id: 'other', bucket: BUCKETS.UNCLASSIFIED });

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word matching so "metro" does not match "metropolitano".
const buildMatcher = (keywords) =>
  new RegExp(`(?:^|[^a-z0-9])(?:${keywords.map(escapeRegExp).join('|')})(?:[^a-z0-9]|$)`);

const CATEGORIES = CATEGORY_DEFINITIONS.map((definition) => ({
  ...definition,
  matcher: buildMatcher(definition.keywords),
}));

const DELIVERY_MATCHER = buildMatcher(['rappi', 'pedidosya', 'pedidos ya', 'glovo', 'delivery']);

const CATEGORY_IDS = Object.freeze([...CATEGORY_DEFINITIONS.map((c) => c.id), OTHER.id]);

function classify(description) {
  const text = normalize(description);
  const match = CATEGORIES.find((category) => category.matcher.test(text));
  return match ? { category: match.id, bucket: match.bucket } : { category: OTHER.id, bucket: OTHER.bucket };
}

function getCategory(id) {
  const match = CATEGORY_DEFINITIONS.find((category) => category.id === id);
  return match ? { category: match.id, bucket: match.bucket } : { category: OTHER.id, bucket: OTHER.bucket };
}

const isDelivery = (description) => DELIVERY_MATCHER.test(normalize(description));

module.exports = { BUCKETS, CATEGORY_IDS, classify, getCategory, isDelivery };
