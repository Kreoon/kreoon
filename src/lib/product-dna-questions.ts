// Tipos de oferta — define el contexto completo de la estrategia
export const OFFER_TYPE_OPTIONS = [
  { id: 'event_webinar',    label: 'Webinar / Live',        emoji: '🎙️', description: 'Clase gratuita, evento en vivo, masterclass' },
  { id: 'service',          label: 'Servicio',              emoji: '🛠️', description: 'Consultoría, asesoría, tratamiento, atención profesional' },
  { id: 'product_physical', label: 'Producto Físico',       emoji: '📦', description: 'Producto tangible, e-commerce, tienda' },
  { id: 'infoproduct',      label: 'Infoproducto / Curso',  emoji: '📚', description: 'Curso online, reto, membresía, programa' },
  { id: 'saas_app',         label: 'SaaS / App',            emoji: '💻', description: 'Software, aplicación, plataforma digital' },
  { id: 'personal_brand',   label: 'Marca Personal',        emoji: '👤', description: 'Posicionamiento personal, creador de contenido, speaker' },
  { id: 'ecommerce',        label: 'E-commerce',            emoji: '🛒', description: 'Tienda online, dropshipping, marketplace' },
  { id: 'consulting',       label: 'Agencia / Consultoría', emoji: '🤝', description: 'Agencia de servicios, firma de consultoría' },
];

// Preguntas base (común a todos los tipos)
const BASE_QUESTIONS = [
  {
    id: 1,
    block: 'Tu Oferta',
    question: '¿Qué ofreces exactamente, para quién es y qué lo hace único frente a la competencia?',
    tip: 'Nombre, propuesta de valor, diferenciador principal'
  },
  {
    id: 2,
    block: 'Tu Cliente Ideal',
    question: '¿Quién es la persona que más necesita esto? Describe su vida, frustraciones y qué busca.',
    tip: 'Edad, perfil, dolores, deseos, situación actual'
  },
  {
    id: 3,
    block: 'El Problema',
    question: '¿Cuál es el problema principal que resuelves? ¿Qué pasa si NO actúan?',
    tip: 'Dolor principal, consecuencia de no actuar, urgencia'
  },
  {
    id: 4,
    block: 'La Transformación',
    question: '¿Qué resultado concreto obtienen? ¿Cómo cambia su vida antes y después?',
    tip: 'Resultado tangible, transformación emocional, casos de éxito'
  },
  {
    id: 5,
    block: 'Tu Oferta',
    question: '¿Cuánto cuesta, qué incluye y qué garantías o testimonios tienes?',
    tip: 'Precio, entregables, garantías, prueba social'
  },
];

// Preguntas específicas por tipo de oferta (reemplazan las base para mayor contexto)
const OFFER_TYPE_QUESTIONS: Record<string, typeof BASE_QUESTIONS> = {
  event_webinar: [
    {
      id: 1,
      block: 'Tu Evento',
      question: '¿De qué trata el webinar/live, quién lo imparte y qué lo hace único o urgente?',
      tip: 'Tema, ponente, fecha, formato (en vivo, grabado, con Q&A)'
    },
    {
      id: 2,
      block: 'Tu Asistente Ideal',
      question: '¿Quién NECESITA asistir a este evento? Describe su situación actual y qué lo frena.',
      tip: 'Perfil, dónde está ahora, qué desea lograr, objeciones para no inscribirse'
    },
    {
      id: 3,
      block: 'El Problema',
      question: '¿Qué problema urgente resuelves en el evento? ¿Qué pasa si NO asisten?',
      tip: 'Dolor que el evento soluciona, costo de no asistir'
    },
    {
      id: 4,
      block: 'Lo que aprenderán',
      question: '¿Qué aprenderán en el evento? Da 3 puntos clave o revelaciones que se llevarán.',
      tip: 'Contenido concreto, aha-moments, metodología'
    },
    {
      id: 5,
      block: 'Inscripción',
      question: '¿Es gratuito o de pago? ¿Cuántos cupos hay? ¿Hay bonus por registrarse antes?',
      tip: 'Precio, urgencia de cupos, bonos, qué pasa después del evento'
    },
  ],
  infoproduct: [
    {
      id: 1,
      block: 'Tu Programa',
      question: '¿Cómo se llama el curso/programa, qué enseñas y en cuánto tiempo lo logran?',
      tip: 'Nombre, módulos, duración, formato (en vivo, asincrónico, comunidad)'
    },
    {
      id: 2,
      block: 'Tu Estudiante Ideal',
      question: '¿Quién es la persona perfecta para tu programa? ¿Dónde está hoy y adónde quiere llegar?',
      tip: 'Nivel, experiencia previa, motivación, objeciones'
    },
    {
      id: 3,
      block: 'El Problema',
      question: '¿Qué frustración o bloqueo específico resuelve tu programa?',
      tip: 'Dolor que frena su progreso, consecuencia de no aprender esto'
    },
    {
      id: 4,
      block: 'La Transformación',
      question: '¿Qué resultado concreto logran al completar el programa? Casos de éxito si tienes.',
      tip: 'Resultado específico, cambio de vida, testimonios'
    },
    {
      id: 5,
      block: 'La Oferta',
      question: '¿Cuánto vale, qué bonos incluye, hay garantía? ¿Cómo se inscribe?',
      tip: 'Precio, garantía, urgencia (cohorte, plazas), proceso de compra'
    },
  ],
  personal_brand: [
    {
      id: 1,
      block: 'Tu Marca',
      question: '¿Qué haces, en qué eres experto/a y cuál es tu punto de vista único?',
      tip: 'Especialidad, posicionamiento, perspectiva diferente al mainstream'
    },
    {
      id: 2,
      block: 'Tu Audiencia',
      question: '¿A quién le hablas? Describe a tu seguidor ideal: qué quiere lograr, qué le preocupa.',
      tip: 'Perfil, aspiraciones, frustraciones, qué busca en tu contenido'
    },
    {
      id: 3,
      block: 'Tu Historia',
      question: '¿Cuál es tu historia personal? ¿Qué viviste que te llevó a donde estás hoy?',
      tip: 'Momento turning point, fracaso que transformaste, credenciales únicas'
    },
    {
      id: 4,
      block: 'Tu Impacto',
      question: '¿Qué transformación generas en tu audiencia? ¿Qué logran gracias a seguirte?',
      tip: 'Cambios reales en seguidores, testimonios, comunidad'
    },
    {
      id: 5,
      block: 'Tu Oferta',
      question: '¿Cómo monetizas? ¿Qué servicios, productos o programas ofreces?',
      tip: 'Forma de ingresos: servicios, cursos, mentoría, colaboraciones'
    },
  ],
};

// Retorna las preguntas correctas según el tipo de oferta
export function getQuestionsForOfferType(offerType: string) {
  return OFFER_TYPE_QUESTIONS[offerType] || BASE_QUESTIONS;
}

// Para compatibilidad — preguntas base por defecto
export const PRODUCT_DNA_QUESTIONS = BASE_QUESTIONS;

// Opciones simplificadas para selección rápida
export const SERVICE_TYPE_OPTIONS = [
  { id: 'video_ugc', label: 'Video UGC', emoji: '🎬' },
  { id: 'photo_ugc', label: 'Foto UGC', emoji: '📸' },
  { id: 'carousel', label: 'Carrusel', emoji: '🖼️' },
  { id: 'reels', label: 'Reels/TikToks', emoji: '📱' },
  { id: 'photography', label: 'Fotografía', emoji: '📷' },
  { id: 'video_editing', label: 'Edición', emoji: '✂️' },
  { id: 'graphic_design', label: 'Diseño', emoji: '🎨' },
  { id: 'strategy', label: 'Estrategia', emoji: '📊' },
];

export const GOAL_OPTIONS = [
  { id: 'sales', label: 'Vender', emoji: '💰' },
  { id: 'awareness', label: 'Dar a conocer', emoji: '👁️' },
  { id: 'leads', label: 'Captar leads', emoji: '📋' },
  { id: 'engagement', label: 'Engagement', emoji: '❤️' },
  { id: 'education', label: 'Educar', emoji: '📚' },
];

export const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'facebook', label: 'Facebook', emoji: '👤' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { id: 'ads', label: 'Ads', emoji: '📣' },
];

export const AUDIENCE_OPTIONS = [
  { id: '18_24', label: '18-24 años', emoji: '🧑' },
  { id: '25_34', label: '25-34 años', emoji: '👨' },
  { id: '35_44', label: '35-44 años', emoji: '👨‍💼' },
  { id: '45_plus', label: '45+ años', emoji: '👴' },
];

export const URGENCY_OPTIONS = [
  { id: 'urgent', label: 'Esta semana', emoji: '🔥' },
  { id: 'soon', label: '2 semanas', emoji: '⚡' },
  { id: 'month', label: 'Este mes', emoji: '📅' },
  { id: 'flexible', label: 'Sin prisa', emoji: '🌿' },
];

// Lista completa de ubicaciones para selector tipo Meta Ads
export interface GeoLocation {
  id: string;
  name: string;
  type: 'region' | 'country' | 'city';
  country?: string; // Para ciudades
  searchTerms?: string[]; // Términos alternativos de búsqueda
}

export const GEO_LOCATIONS: GeoLocation[] = [
  // Regiones
  { id: 'worldwide', name: 'Todo el mundo', type: 'region' },
  { id: 'latam', name: 'Latinoamérica', type: 'region', searchTerms: ['latam', 'america latina'] },
  { id: 'europe', name: 'Europa', type: 'region' },
  { id: 'north_america', name: 'Norteamérica', type: 'region' },
  { id: 'central_america', name: 'Centroamérica', type: 'region' },
  { id: 'south_america', name: 'Sudamérica', type: 'region' },
  { id: 'spanish_speaking', name: 'Países hispanohablantes', type: 'region', searchTerms: ['hispano', 'español'] },

  // Países - Latinoamérica
  { id: 'AR', name: 'Argentina', type: 'country' },
  { id: 'BO', name: 'Bolivia', type: 'country' },
  { id: 'BR', name: 'Brasil', type: 'country' },
  { id: 'CL', name: 'Chile', type: 'country' },
  { id: 'CO', name: 'Colombia', type: 'country' },
  { id: 'CR', name: 'Costa Rica', type: 'country' },
  { id: 'CU', name: 'Cuba', type: 'country' },
  { id: 'DO', name: 'República Dominicana', type: 'country', searchTerms: ['dominicana', 'rd'] },
  { id: 'EC', name: 'Ecuador', type: 'country' },
  { id: 'SV', name: 'El Salvador', type: 'country' },
  { id: 'GT', name: 'Guatemala', type: 'country' },
  { id: 'HN', name: 'Honduras', type: 'country' },
  { id: 'MX', name: 'México', type: 'country', searchTerms: ['mexico'] },
  { id: 'NI', name: 'Nicaragua', type: 'country' },
  { id: 'PA', name: 'Panamá', type: 'country', searchTerms: ['panama'] },
  { id: 'PY', name: 'Paraguay', type: 'country' },
  { id: 'PE', name: 'Perú', type: 'country', searchTerms: ['peru'] },
  { id: 'PR', name: 'Puerto Rico', type: 'country' },
  { id: 'UY', name: 'Uruguay', type: 'country' },
  { id: 'VE', name: 'Venezuela', type: 'country' },

  // Países - Europa
  { id: 'ES', name: 'España', type: 'country', searchTerms: ['espana'] },
  { id: 'PT', name: 'Portugal', type: 'country' },
  { id: 'FR', name: 'Francia', type: 'country' },
  { id: 'IT', name: 'Italia', type: 'country' },
  { id: 'DE', name: 'Alemania', type: 'country' },
  { id: 'GB', name: 'Reino Unido', type: 'country', searchTerms: ['uk', 'inglaterra'] },
  { id: 'NL', name: 'Países Bajos', type: 'country', searchTerms: ['holanda'] },

  // Países - Norteamérica
  { id: 'US', name: 'Estados Unidos', type: 'country', searchTerms: ['usa', 'eeuu'] },
  { id: 'CA', name: 'Canadá', type: 'country', searchTerms: ['canada'] },

  // Ciudades principales - Colombia
  { id: 'CO-BOG', name: 'Bogotá', type: 'city', country: 'CO' },
  { id: 'CO-MDE', name: 'Medellín', type: 'city', country: 'CO', searchTerms: ['medellin'] },
  { id: 'CO-CLO', name: 'Cali', type: 'city', country: 'CO' },
  { id: 'CO-BAQ', name: 'Barranquilla', type: 'city', country: 'CO' },
  { id: 'CO-CTG', name: 'Cartagena', type: 'city', country: 'CO' },

  // Ciudades principales - México
  { id: 'MX-MEX', name: 'Ciudad de México', type: 'city', country: 'MX', searchTerms: ['cdmx', 'df'] },
  { id: 'MX-GDL', name: 'Guadalajara', type: 'city', country: 'MX' },
  { id: 'MX-MTY', name: 'Monterrey', type: 'city', country: 'MX' },
  { id: 'MX-TIJ', name: 'Tijuana', type: 'city', country: 'MX' },
  { id: 'MX-CUN', name: 'Cancún', type: 'city', country: 'MX', searchTerms: ['cancun'] },

  // Ciudades principales - Argentina
  { id: 'AR-BUE', name: 'Buenos Aires', type: 'city', country: 'AR' },
  { id: 'AR-COR', name: 'Córdoba', type: 'city', country: 'AR', searchTerms: ['cordoba'] },
  { id: 'AR-ROS', name: 'Rosario', type: 'city', country: 'AR' },
  { id: 'AR-MZA', name: 'Mendoza', type: 'city', country: 'AR' },

  // Ciudades principales - Chile
  { id: 'CL-SCL', name: 'Santiago', type: 'city', country: 'CL' },
  { id: 'CL-VAP', name: 'Valparaíso', type: 'city', country: 'CL', searchTerms: ['valparaiso'] },
  { id: 'CL-CCP', name: 'Concepción', type: 'city', country: 'CL', searchTerms: ['concepcion'] },

  // Ciudades principales - Perú
  { id: 'PE-LIM', name: 'Lima', type: 'city', country: 'PE' },
  { id: 'PE-AQP', name: 'Arequipa', type: 'city', country: 'PE' },
  { id: 'PE-TRU', name: 'Trujillo', type: 'city', country: 'PE' },

  // Ciudades principales - España
  { id: 'ES-MAD', name: 'Madrid', type: 'city', country: 'ES' },
  { id: 'ES-BCN', name: 'Barcelona', type: 'city', country: 'ES' },
  { id: 'ES-VLC', name: 'Valencia', type: 'city', country: 'ES' },
  { id: 'ES-SEV', name: 'Sevilla', type: 'city', country: 'ES' },

  // Ciudades principales - USA (hispanas)
  { id: 'US-MIA', name: 'Miami', type: 'city', country: 'US' },
  { id: 'US-LAX', name: 'Los Ángeles', type: 'city', country: 'US', searchTerms: ['los angeles', 'la'] },
  { id: 'US-NYC', name: 'Nueva York', type: 'city', country: 'US', searchTerms: ['new york', 'ny'] },
  { id: 'US-HOU', name: 'Houston', type: 'city', country: 'US' },
  { id: 'US-CHI', name: 'Chicago', type: 'city', country: 'US' },
  { id: 'US-DFW', name: 'Dallas', type: 'city', country: 'US' },
  { id: 'US-PHX', name: 'Phoenix', type: 'city', country: 'US' },
  { id: 'US-SAN', name: 'San Diego', type: 'city', country: 'US' },
];

// Función para buscar ubicaciones
export function searchGeoLocations(query: string, limit = 10): GeoLocation[] {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return GEO_LOCATIONS
    .filter(loc => {
      const name = loc.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const terms = loc.searchTerms?.map(t => t.toLowerCase()) || [];
      return name.includes(q) || terms.some(t => t.includes(q)) || loc.id.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Priorizar coincidencias al inicio
      const aName = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bName = b.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const aStarts = aName.startsWith(q) ? 0 : 1;
      const bStarts = bName.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      // Luego por tipo: region > country > city
      const typeOrder = { region: 0, country: 1, city: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    })
    .slice(0, limit);
}

// Helper para obtener el nombre completo de una ubicación (ciudad + país)
export function getLocationDisplayName(loc: GeoLocation): string {
  if (loc.type === 'city' && loc.country) {
    const country = GEO_LOCATIONS.find(l => l.id === loc.country);
    return `${loc.name}, ${country?.name || loc.country}`;
  }
  return loc.name;
}

// Helper para obtener el icono según el tipo
export function getLocationIcon(type: GeoLocation['type']): string {
  switch (type) {
    case 'region': return '🌍';
    case 'country': return '🏳️';
    case 'city': return '🏙️';
  }
}
