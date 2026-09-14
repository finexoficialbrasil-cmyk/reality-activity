// Cores oficiais das marcas — visitantes reconhecem marcas grandes e confiam mais
export const BRAND_COLORS = {
  mercadolivre: '#FFE600',
  mercado_livre: '#FFE600',
  airbnb: '#FF5A5F',
  amazon: '#FF9900',
  shopee: '#EE4D2D',
  magalu: '#0086FF',
  magazineluiza: '#0086FF',
  americanas: '#E60012',
  aliexpress: '#E62E04',
  shein: '#F2F2F2',
  mercadopago: '#00B1EA',
  netflix: '#E50914',
  spotify: '#1DB954',
  ifood: '#EA1D2C',
  olx: '#6E278E',
  ebay: '#E53238',
  walmart: '#FFC220',
  apple: '#A8A8A8',
  google: '#4285F4',
  microsoft: '#00A4EF',
  samsung: '#1428A0',
  nike: '#FF6900',
  adidas: '#FFFFFF',
  coca: '#F40009',
  pepsi: '#004B93',
  starbucks: '#00704A',
  mcdonalds: '#FFC72C',
  burger: '#E5A728',
  netshoes: '#FF1F4B',
  kabum: '#8DC63F',
  pichau: '#FF5500',
  terabithia: '#00C2FF',
  mercadolivrebrasil: '#FFE600',
};

// Resolve a cor oficial da marca a partir do slug/valor da categoria
export const getBrandColor = (category) => {
  if (!category) return null;
  const slug = String(category).toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  return BRAND_COLORS[slug] || null;
};

// Decide cor do texto (escuro/claro) com base na luminância da cor da marca
export const getContrastColor = (hex) => {
  if (!hex) return '#000';
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#000' : '#fff';
};

// Formata o slug da categoria para exibição amigável (ex: mercado_livre -> Mercado Livre)
export const formatBrandLabel = (category) => {
  if (!category) return 'anúncio';
  return String(category)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};