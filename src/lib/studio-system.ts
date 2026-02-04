// ============================================
// SISTEMA DE NIVELES - "EL ESTUDIO"
// ============================================

export const NIVELES = [
  { nivel: 1, nombre: 'Pasante', xpRequerido: 0, color: '#6b7280', descripcion: 'Iniciando en el estudio' },
  { nivel: 2, nombre: 'Asistente', xpRequerido: 500, color: '#8b5cf6', descripcion: 'Aprendiendo el oficio' },
  { nivel: 3, nombre: 'Técnico', xpRequerido: 1500, color: '#7c3aed', descripcion: 'Ejecutando con precisión' },
  { nivel: 4, nombre: 'Realizador', xpRequerido: 3500, color: '#6d28d9', descripcion: 'Produciendo resultados' },
  { nivel: 5, nombre: 'Productor', xpRequerido: 7000, color: '#5b21b6', descripcion: 'Liderando proyectos' },
  { nivel: 6, nombre: 'Productor Senior', xpRequerido: 12000, color: '#4c1d95', descripcion: 'Destacando en el estudio' },
  { nivel: 7, nombre: 'Director', xpRequerido: 20000, color: '#f59e0b', descripcion: 'Dominando el arte' },
  { nivel: 8, nombre: 'Director Creativo', xpRequerido: 35000, color: '#d97706', descripcion: 'Inspirando a otros' },
  { nivel: 9, nombre: 'Showrunner', xpRequerido: 60000, color: '#b45309', descripcion: 'Transformando el estudio' },
  { nivel: 10, nombre: 'Leyenda del Estudio', xpRequerido: 100000, color: '#fbbf24', descripcion: 'Trascendiendo límites' },
] as const;

export type NivelInfo = typeof NIVELES[number];

// Función para obtener nivel actual basado en XP
export const getNivelActual = (xp: number): NivelInfo => {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (xp >= NIVELES[i].xpRequerido) {
      return NIVELES[i];
    }
  }
  return NIVELES[0];
};

// Función para obtener progreso al siguiente nivel
export const getProgresoNivel = (xp: number): { actual: NivelInfo; siguiente: NivelInfo | null; progreso: number; xpFaltante: number } => {
  const actual = getNivelActual(xp);
  const siguienteIndex = NIVELES.findIndex(n => n.nivel === actual.nivel) + 1;
  const siguiente = siguienteIndex < NIVELES.length ? NIVELES[siguienteIndex] : null;

  if (!siguiente) {
    return { actual, siguiente: null, progreso: 100, xpFaltante: 0 };
  }

  const xpEnNivelActual = xp - actual.xpRequerido;
  const xpNecesarioParaSiguiente = siguiente.xpRequerido - actual.xpRequerido;
  const progreso = Math.min((xpEnNivelActual / xpNecesarioParaSiguiente) * 100, 100);
  const xpFaltante = siguiente.xpRequerido - xp;

  return { actual, siguiente, progreso, xpFaltante };
};

// ============================================
// SISTEMA DE INSIGNIAS / PREMIOS
// ============================================

export const INSIGNIAS = {
  // Calidad
  CORTE_LIMPIO: {
    id: 'corte_limpio',
    nombre: 'Corte Limpio',
    descripcion: '5 entregas aprobadas sin revisiones',
    icono: 'Sparkles',
    categoria: 'calidad',
    creditos: 100,
    color: '#10b981',
  },
  RATING_PERFECTO: {
    id: 'rating_perfecto',
    nombre: 'Rating Perfecto',
    descripcion: 'Mantener rating 5.0 por 10 entregas',
    icono: 'Star',
    categoria: 'calidad',
    creditos: 200,
    color: '#fbbf24',
  },

  // Velocidad
  TOMA_UNICA: {
    id: 'toma_unica',
    nombre: 'Toma Única',
    descripcion: 'Entrega aprobada en el primer intento',
    icono: 'Zap',
    categoria: 'velocidad',
    creditos: 50,
    color: '#3b82f6',
  },
  ENTREGA_EXPRESS: {
    id: 'entrega_express',
    nombre: 'Entrega Express',
    descripcion: 'Entregar 24 horas antes del deadline',
    icono: 'Clock',
    categoria: 'velocidad',
    creditos: 75,
    color: '#06b6d4',
  },

  // Volumen
  MARATONISTA: {
    id: 'maratonista',
    nombre: 'Maratonista',
    descripcion: '20+ piezas completadas en un mes',
    icono: 'Trophy',
    categoria: 'volumen',
    creditos: 300,
    color: '#8b5cf6',
  },
  PRIMERA_PRODUCCION: {
    id: 'primera_produccion',
    nombre: 'Primera Producción',
    descripcion: 'Completar tu primera pieza',
    icono: 'Award',
    categoria: 'inicio',
    creditos: 100,
    color: '#ec4899',
  },

  // Consistencia
  SIEMPRE_EN_SET: {
    id: 'siempre_en_set',
    nombre: 'Siempre en Set',
    descripcion: '30 días activo consecutivos',
    icono: 'Flame',
    categoria: 'consistencia',
    creditos: 250,
    color: '#f97316',
  },
  RACHA_SEMANAL: {
    id: 'racha_semanal',
    nombre: 'Racha Semanal',
    descripcion: '7 días activo consecutivos',
    icono: 'Calendar',
    categoria: 'consistencia',
    creditos: 50,
    color: '#14b8a6',
  },

  // Colaboración
  MEJOR_ELENCO: {
    id: 'mejor_elenco',
    nombre: 'Mejor Elenco',
    descripcion: 'Proyecto con rating 5 de todo el equipo',
    icono: 'Users',
    categoria: 'colaboracion',
    creditos: 150,
    color: '#6366f1',
  },

  // Viral
  TAQUILLERO: {
    id: 'taquillero',
    nombre: 'Taquillero',
    descripcion: 'Contenido con métricas virales',
    icono: 'TrendingUp',
    categoria: 'viral',
    creditos: 500,
    color: '#ef4444',
  },

  // Especiales
  DIRECTOR_DEL_MES: {
    id: 'director_del_mes',
    nombre: 'Director del Mes',
    descripcion: 'Top 1 del ranking mensual',
    icono: 'Crown',
    categoria: 'liderazgo',
    creditos: 1000,
    color: '#fbbf24',
  },
  CLASICO_DE_ORO: {
    id: 'clasico_de_oro',
    nombre: 'Clásico de Oro',
    descripcion: '1 año activo en Kreoon',
    icono: 'Medal',
    categoria: 'veterano',
    creditos: 500,
    color: '#d97706',
  },
  ESTRELLA_DE_KREOON: {
    id: 'estrella_de_kreoon',
    nombre: 'Estrella de Kreoon',
    descripcion: 'Top 1% del estudio',
    icono: 'Sparkles',
    categoria: 'elite',
    creditos: 1000,
    color: '#7c3aed',
  },
} as const;

export type InsigniaKey = keyof typeof INSIGNIAS;
export type Insignia = typeof INSIGNIAS[InsigniaKey];

// ============================================
// ESTADOS DE CONTENIDO
// ============================================

export const ESTADOS_CONTENIDO = {
  draft: {
    id: 'draft',
    nombre: 'En Escritura',
    nombreCorto: 'Escritura',
    icono: 'Pencil',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.2)',
    descripcion: 'El guión está siendo escrito',
  },
  script_review: {
    id: 'script_review',
    nombre: 'Guión en Revisión',
    nombreCorto: 'Rev. Guión',
    icono: 'FileText',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    descripcion: 'Esperando aprobación del guión',
  },
  script_approved: {
    id: 'script_approved',
    nombre: 'Guión Aprobado',
    nombreCorto: 'Guión OK',
    icono: 'FileCheck',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.2)',
    descripcion: 'Guión aprobado, listo para grabar',
  },
  recording: {
    id: 'recording',
    nombre: 'En Rodaje',
    nombreCorto: 'Rodaje',
    icono: 'Video',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    descripcion: 'Contenido siendo grabado',
  },
  recorded: {
    id: 'recorded',
    nombre: 'Material Grabado',
    nombreCorto: 'Grabado',
    icono: 'Film',
    color: '#1d4ed8',
    bgColor: 'rgba(29, 78, 216, 0.2)',
    descripcion: 'Material listo para edición',
  },
  editing: {
    id: 'editing',
    nombre: 'En Post-Producción',
    nombreCorto: 'Post-Prod',
    icono: 'Scissors',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
    descripcion: 'En proceso de edición',
  },
  edited: {
    id: 'edited',
    nombre: 'Corte Listo',
    nombreCorto: 'Editado',
    icono: 'Clapperboard',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.2)',
    descripcion: 'Edición completada',
  },
  review: {
    id: 'review',
    nombre: 'En Sala de Revisión',
    nombreCorto: 'Revisión',
    icono: 'Eye',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.2)',
    descripcion: 'Esperando aprobación del cliente',
  },
  revision: {
    id: 'revision',
    nombre: 'Ajustes Solicitados',
    nombreCorto: 'Ajustes',
    icono: 'RotateCcw',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    descripcion: 'Cliente solicitó cambios',
  },
  approved: {
    id: 'approved',
    nombre: 'Corte Final Aprobado',
    nombreCorto: 'Aprobado',
    icono: 'CheckCircle',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.2)',
    descripcion: 'Contenido aprobado por cliente',
  },
  delivered: {
    id: 'delivered',
    nombre: 'Entregado',
    nombreCorto: 'Entregado',
    icono: 'Package',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.2)',
    descripcion: 'Entregado al cliente',
  },
  published: {
    id: 'published',
    nombre: 'En Cartelera',
    nombreCorto: 'Publicado',
    icono: 'Megaphone',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.2)',
    descripcion: 'Publicado y activo',
  },
} as const;

export type EstadoContenido = keyof typeof ESTADOS_CONTENIDO;
export type EstadoInfo = typeof ESTADOS_CONTENIDO[EstadoContenido];

// ============================================
// ACCIONES Y CRÉDITOS
// ============================================

export const ACCIONES_CREDITOS = {
  completar_perfil: { creditos: 100, descripcion: 'Completar perfil' },
  primera_pieza: { creditos: 200, descripcion: 'Primera pieza aprobada' },
  pieza_aprobada: { creditos: 50, descripcion: 'Pieza aprobada' },
  pieza_sin_revision: { creditos: 75, descripcion: 'Pieza aprobada sin revisiones' },
  entrega_anticipada: { creditos: 30, descripcion: 'Entrega anticipada' },
  rating_5: { creditos: 40, descripcion: 'Rating 5 estrellas' },
  produccion_completa: { creditos: 150, descripcion: 'Producción completa' },
  racha_7_dias: { creditos: 100, descripcion: 'Racha de 7 días' },
  racha_30_dias: { creditos: 500, descripcion: 'Racha de 30 días' },
  referido_activo: { creditos: 300, descripcion: 'Referido activado' },
  top_3_mes: { creditos: 1000, descripcion: 'Top 3 del mes' },
} as const;

// ============================================
// VOCABULARIO POR ROL
// ============================================

export const VOCABULARIO_ROL = {
  admin: {
    dashboard: 'Sala de Control',
    bienvenida: 'Bienvenido a la Sala de Control',
    seccionPrincipal: 'Cartelera General',
    equipo: 'Elenco y Crew',
    finanzas: 'Taquilla',
    metas: 'Metas de Temporada',
  },
  team_leader: {
    dashboard: 'Sala de Control',
    bienvenida: 'Bienvenido a la Sala de Control',
    seccionPrincipal: 'Cartelera General',
    equipo: 'Mi Equipo',
    finanzas: 'Taquilla del Equipo',
    metas: 'Metas de Temporada',
  },
  strategist: {
    dashboard: 'Mesa de Guionistas',
    bienvenida: 'Bienvenido a la Mesa de Guionistas',
    seccionPrincipal: 'Mis Guiones',
    trabajo: 'Escribir Guión',
    asignar: 'Hacer Casting',
    ia: 'Asistente de Escritura',
  },
  trafficker: {
    dashboard: 'Centro de Operaciones',
    bienvenida: 'Bienvenido al Centro de Operaciones',
    seccionPrincipal: 'Mis Campañas',
    trabajo: 'Gestionar Tráfico',
    metricas: 'Métricas de Rendimiento',
    ia: 'Asistente de Tráfico',
  },
  creator: {
    dashboard: 'Camerino',
    bienvenida: 'Bienvenido a tu Camerino',
    seccionPrincipal: 'Mis Llamados',
    trabajo: 'Ir a Rodaje',
    entregar: 'Entregar Toma',
    ganancias: 'Mis Créditos',
    portafolio: 'Mi Reel',
  },
  editor: {
    dashboard: 'Sala de Edición',
    bienvenida: 'Bienvenido a la Sala de Edición',
    seccionPrincipal: 'Post-Producción',
    trabajo: 'Entrar a Corte',
    entregar: 'Exportar Corte',
    ganancias: 'Mis Créditos',
    portafolio: 'Mi Reel',
  },
  client: {
    dashboard: 'Sala de Proyecciones',
    bienvenida: 'Bienvenido a tu Sala de Proyecciones',
    seccionPrincipal: 'Mis Producciones',
    revisar: 'Sala de Revisión',
    aprobar: 'Aprobar Corte',
    finanzas: 'Mi Inversión',
    archivo: 'Archivo de Producciones',
  },
} as const;

export type RolUsuario = keyof typeof VOCABULARIO_ROL;

// ============================================
// TEMPORADAS
// ============================================

export const getTemporadaActual = (): { nombre: string; numero: number; año: number; fechaInicio: Date; fechaFin: Date } => {
  const ahora = new Date();
  const mes = ahora.getMonth();
  const año = ahora.getFullYear();

  let numero: number;
  let fechaInicio: Date;
  let fechaFin: Date;

  if (mes < 3) {
    numero = 1;
    fechaInicio = new Date(año, 0, 1);
    fechaFin = new Date(año, 2, 31);
  } else if (mes < 6) {
    numero = 2;
    fechaInicio = new Date(año, 3, 1);
    fechaFin = new Date(año, 5, 30);
  } else if (mes < 9) {
    numero = 3;
    fechaInicio = new Date(año, 6, 1);
    fechaFin = new Date(año, 8, 30);
  } else {
    numero = 4;
    fechaInicio = new Date(año, 9, 1);
    fechaFin = new Date(año, 11, 31);
  }

  return {
    nombre: `Temporada ${numero}`,
    numero,
    año,
    fechaInicio,
    fechaFin,
  };
};

// ============================================
// HELPERS DE UI
// ============================================

export const getMensajeVacio = (seccion: string): { titulo: string; descripcion: string } => {
  const mensajes: Record<string, { titulo: string; descripcion: string }> = {
    llamados: {
      titulo: 'El set está vacío',
      descripcion: 'Aún no tienes llamados asignados. ¡Pronto llegará tu momento!',
    },
    producciones: {
      titulo: 'Sin producciones activas',
      descripcion: 'Es hora de crear tu primera producción.',
    },
    reel: {
      titulo: 'Tu reel está esperando',
      descripcion: 'Completa tu primera pieza para empezar a construir tu portafolio.',
    },
    notificaciones: {
      titulo: 'Todo al día',
      descripcion: 'No tienes llamados pendientes.',
    },
    ranking: {
      titulo: 'Ranking en construcción',
      descripcion: 'Completa más producciones para aparecer aquí.',
    },
  };

  return mensajes[seccion] || { titulo: 'Sin datos', descripcion: 'No hay información disponible.' };
};

export const getMensajeLogro = (tipo: string, valor?: number): string => {
  const mensajes: Record<string, string> = {
    nivel_subido: `¡Felicidades! Has subido de nivel`,
    insignia: `¡Nueva insignia desbloqueada!`,
    creditos: `+${valor} Créditos ganados`,
    racha: `¡Racha de ${valor} días! Sigue así`,
    top_ranking: `¡Entraste al Top ${valor}!`,
  };

  return mensajes[tipo] || '¡Logro desbloqueado!';
};

// ============================================
// COLORES DEL TEMA "EL ESTUDIO"
// ============================================

export const STUDIO_COLORS = {
  // Fondos principales
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  bgCard: 'rgba(26, 26, 37, 0.8)',
  bgGlass: 'rgba(139, 92, 246, 0.1)',

  // Acentos púrpura
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6d28d9',
    900: '#5b21b6',
    950: '#4c1d95',
  },

  // Acentos secundarios
  accent: {
    cyan: '#06b6d4',
    pink: '#ec4899',
    orange: '#f97316',
    gold: '#fbbf24',
  },

  // Estados
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Texto
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',

  // Bordes y sombras
  border: 'rgba(139, 92, 246, 0.2)',
  borderHover: 'rgba(139, 92, 246, 0.4)',
  glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  glowStrong: '0 0 40px rgba(139, 92, 246, 0.5)',
} as const;

// ============================================
// GRADIENTES
// ============================================

export const STUDIO_GRADIENTS = {
  primary: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
  secondary: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
  gold: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
  success: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  glass: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
  dark: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
  card: 'linear-gradient(135deg, rgba(26, 26, 37, 0.9) 0%, rgba(18, 18, 26, 0.9) 100%)',
} as const;
