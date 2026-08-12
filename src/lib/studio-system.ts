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
  };

  return mensajes[seccion] || { titulo: 'Sin datos', descripcion: 'No hay información disponible.' };
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
