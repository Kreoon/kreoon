import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  FileText,
  CheckSquare,
  Users,
  CalendarClock,
  Video,
  Sparkles,
  Layout,
  MessageSquare,
  Lightbulb,
  Search,
  UserCheck,
  Scale,
  Calendar,
  LineChart,
  TrendingUp,
  Target,
  Eye,
  GraduationCap,
  Star,
  Zap,
  Route,
  Radio,
  ListChecks,
  PlayCircle,
  Wand2,
  Brain,
} from 'lucide-react';
import type { KiroZone } from '@/contexts/KiroContext';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ZoneAction {
  /** Icono de Lucide React */
  icon: LucideIcon;
  /** Texto corto del botón */
  label: string;
  /** Descripción que aparece debajo del label */
  description: string;
  /** Prompt que se envía al chat de KIRO al hacer clic */
  prompt: string;
  /** Orden de aparición (menor = primero) */
  priority: number;
}

export interface ZoneConfig {
  /** Nombre para mostrar: "Sala de Edición", "Casting", etc. */
  zoneName: string;
  /** Emoji representativo de la zona */
  zoneEmoji: string;
  /** Mensaje que KIRO dice al detectar que el usuario llegó a esta zona */
  greeting: string;
  /** Acciones específicas de la zona */
  actions: ZoneAction[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN POR ZONA
// ═══════════════════════════════════════════════════════════════════════════

export const ZONE_CONFIGS: Record<KiroZone, ZoneConfig> = {
  // ─────────────────────────────────────────────────────────────────────────
  // SALA DE CONTROL - Dashboard admin
  // ─────────────────────────────────────────────────────────────────────────
  'sala-de-control': {
    zoneName: 'Sala de Control',
    zoneEmoji: '📊',
    greeting: '¡Bienvenido a la Sala de Control! ¿Qué quieres supervisar hoy?',
    actions: [
      {
        icon: Activity,
        label: 'Resumen del día',
        description: 'Actividad general de hoy',
        prompt: 'Dame un resumen de la actividad de hoy en la plataforma',
        priority: 1,
      },
      {
        icon: BarChart3,
        label: 'KPIs activos',
        description: 'Métricas clave semanales',
        prompt: '¿Cuáles son las métricas clave de esta semana?',
        priority: 2,
      },
      {
        icon: Clock,
        label: 'Producciones pendientes',
        description: 'En proceso actualmente',
        prompt: '¿Cuántas producciones están en proceso?',
        priority: 3,
      },
      {
        icon: AlertTriangle,
        label: 'Alertas del sistema',
        description: 'Urgentes y pendientes',
        prompt: '¿Hay algo urgente que deba atender?',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CAMERINO - Perfil y portfolio del creador
  // ─────────────────────────────────────────────────────────────────────────
  'camerino': {
    zoneName: 'Camerino',
    zoneEmoji: '🪞',
    greeting: '¡Bienvenido a tu Camerino! ¿Trabajamos en tu perfil?',
    actions: [
      {
        icon: Users,
        label: 'Mejorar perfil',
        description: 'Optimiza tu presentación',
        prompt: 'Ayúdame a mejorar mi perfil de creador para atraer más marcas',
        priority: 1,
      },
      {
        icon: Video,
        label: 'Revisar portafolio',
        description: 'Analiza tus mejores videos',
        prompt: 'Analiza mi portafolio y sugiere qué videos destacar',
        priority: 2,
      },
      {
        icon: TrendingUp,
        label: 'Mi progreso',
        description: 'Evolución y logros',
        prompt: '¿Cómo ha sido mi progreso como creador este mes?',
        priority: 3,
      },
      {
        icon: Target,
        label: 'Oportunidades',
        description: 'Campañas que te encajan',
        prompt: 'Busca oportunidades de campañas que encajen con mi perfil',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALA DE EDICIÓN - Campaigns/Productions/Kanban
  // ─────────────────────────────────────────────────────────────────────────
  'sala-de-edicion': {
    zoneName: 'Sala de Edición',
    zoneEmoji: '🎞️',
    greeting: 'Estás en la Sala de Edición. ¿Movemos algunas producciones?',
    actions: [
      {
        icon: ArrowRightLeft,
        label: 'Mover producción',
        description: 'Cambiar estado',
        prompt: 'Ayúdame a cambiar el estado de una producción',
        priority: 1,
      },
      {
        icon: FileText,
        label: 'Crear brief',
        description: 'Nueva campaña',
        prompt: 'Necesito crear un nuevo brief para una campaña',
        priority: 2,
      },
      {
        icon: CheckSquare,
        label: 'Revisar entregas',
        description: 'Pendientes de revisión',
        prompt: '¿Qué entregas están pendientes de revisión?',
        priority: 3,
      },
      {
        icon: Users,
        label: 'Asignar creador',
        description: 'A esta producción',
        prompt: 'Quiero asignar un creador a esta producción',
        priority: 4,
      },
      {
        icon: CalendarClock,
        label: 'Programar entrega',
        description: 'Fecha límite',
        prompt: 'Necesito programar una fecha de entrega para esta producción',
        priority: 5,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SET DE GRABACIÓN - Scripts/Content
  // ─────────────────────────────────────────────────────────────────────────
  'set-de-grabacion': {
    zoneName: 'Set de Grabación',
    zoneEmoji: '🎬',
    greeting: '¡Luces, cámara, acción! ¿Qué vamos a crear hoy?',
    actions: [
      {
        icon: FileText,
        label: 'Escribir guión',
        description: 'Video UGC',
        prompt: 'Genera un guión para un video UGC de mi producto',
        priority: 1,
      },
      {
        icon: Sparkles,
        label: 'Generar hooks',
        description: '5 hooks virales',
        prompt: 'Dame 5 hooks virales para los primeros 3 segundos del video',
        priority: 2,
      },
      {
        icon: Layout,
        label: 'Storyboard',
        description: 'Visual del video',
        prompt: 'Crea un storyboard visual para este brief',
        priority: 3,
      },
      {
        icon: MessageSquare,
        label: 'Evaluar contenido',
        description: 'Feedback de video',
        prompt: 'Analiza este contenido y dame feedback para mejorarlo',
        priority: 4,
      },
      {
        icon: Lightbulb,
        label: 'Ideas de formato',
        description: 'Tendencias actuales',
        prompt: '¿Qué formatos de contenido están funcionando en mi nicho?',
        priority: 5,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CASTING - Creators/Matching
  // ─────────────────────────────────────────────────────────────────────────
  'casting': {
    zoneName: 'Casting',
    zoneEmoji: '🎭',
    greeting: 'Estamos en Casting. ¿Buscamos talento?',
    actions: [
      {
        icon: Search,
        label: 'Buscar creadores',
        description: 'Por nicho o estilo',
        prompt: 'Encuentra creadores que encajen con mi nicho y estilo de marca',
        priority: 1,
      },
      {
        icon: UserCheck,
        label: 'Matching inteligente',
        description: 'IA recomienda',
        prompt: 'Recomiéndame los mejores creadores para esta campaña',
        priority: 2,
      },
      {
        icon: Scale,
        label: 'Comparar perfiles',
        description: 'Métricas lado a lado',
        prompt: 'Compara estos creadores según sus métricas de rendimiento',
        priority: 3,
      },
      {
        icon: Calendar,
        label: 'Ver disponibilidad',
        description: 'Esta semana',
        prompt: '¿Qué creadores están disponibles esta semana?',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALA DE PRENSA - Analytics/Reports
  // ─────────────────────────────────────────────────────────────────────────
  'sala-de-prensa': {
    zoneName: 'Sala de Prensa',
    zoneEmoji: '📰',
    greeting: 'Sala de Prensa activa. ¿Qué datos necesitas?',
    actions: [
      {
        icon: FileText,
        label: 'Reporte de campaña',
        description: 'Última campaña',
        prompt: 'Genera un reporte completo de la última campaña',
        priority: 1,
      },
      {
        icon: TrendingUp,
        label: 'Analizar tendencias',
        description: 'Lo que funciona',
        prompt: '¿Qué tendencias de contenido están funcionando en mi nicho?',
        priority: 2,
      },
      {
        icon: LineChart,
        label: 'Comparar performance',
        description: 'Últimas campañas',
        prompt: 'Compara el rendimiento de las últimas 3 campañas',
        priority: 3,
      },
      {
        icon: Eye,
        label: 'Investigar competencia',
        description: 'Análisis de mercado',
        prompt: 'Analiza qué está haciendo la competencia en mi sector',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ESCUELA - Training/Academy
  // ─────────────────────────────────────────────────────────────────────────
  'escuela': {
    zoneName: 'Escuela',
    zoneEmoji: '🎓',
    greeting: '¡Bienvenido a la Escuela! ¿Qué quieres aprender hoy?',
    actions: [
      {
        icon: GraduationCap,
        label: 'Recomendar formación',
        description: 'Según tu nivel',
        prompt: '¿Qué curso me recomiendas según mi nivel actual?',
        priority: 1,
      },
      {
        icon: Star,
        label: 'Evaluar mi nivel',
        description: 'Como creador UGC',
        prompt: 'Evalúa mis habilidades actuales como creador UGC',
        priority: 2,
      },
      {
        icon: Zap,
        label: 'Tips rápidos',
        description: 'Mejora inmediata',
        prompt: 'Dame un tip rápido para mejorar mis videos hoy',
        priority: 3,
      },
      {
        icon: Route,
        label: 'Ruta de aprendizaje',
        description: 'Plan personalizado',
        prompt: 'Diseña una ruta de aprendizaje para mejorar mi edición de video',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LIVE STAGE - Live Shopping
  // ─────────────────────────────────────────────────────────────────────────
  'live-stage': {
    zoneName: 'Live Stage',
    zoneEmoji: '🔴',
    greeting: '¡El Live Stage está listo! ¿Preparamos un show?',
    actions: [
      {
        icon: FileText,
        label: 'Script de Live',
        description: 'Live Shopping',
        prompt: 'Genera un script para un Live Shopping de mi producto',
        priority: 1,
      },
      {
        icon: Calendar,
        label: 'Planificar evento',
        description: 'Próximo Live',
        prompt: 'Ayúdame a planificar un evento de Live Shopping',
        priority: 2,
      },
      {
        icon: ListChecks,
        label: 'Checklist pre-live',
        description: 'Todo listo',
        prompt: 'Dame el checklist completo de lo que necesito antes del Live',
        priority: 3,
      },
      {
        icon: PlayCircle,
        label: 'Analizar live anterior',
        description: 'Métricas y mejoras',
        prompt: '¿Cómo fue el rendimiento del último Live? ¿Qué puedo mejorar?',
        priority: 4,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GENERAL - Fallback para rutas no mapeadas
  // ─────────────────────────────────────────────────────────────────────────
  'general': {
    zoneName: 'General',
    zoneEmoji: '🏠',
    greeting: '¡Hola! ¿En qué te puedo ayudar?',
    actions: [
      {
        icon: FileText,
        label: 'Crear Brief',
        description: 'Nueva campaña',
        prompt: 'Ayúdame a crear un brief para una nueva campaña',
        priority: 1,
      },
      {
        icon: Search,
        label: 'Buscar Creador',
        description: 'Encuentra talento',
        prompt: 'Necesito encontrar creadores ideales para mi nicho',
        priority: 2,
      },
      {
        icon: Sparkles,
        label: 'Generar Hook',
        description: 'Primeros 3 segundos',
        prompt: 'Genera 3 hooks creativos para los primeros 3 segundos de un video',
        priority: 3,
      },
      {
        icon: BarChart3,
        label: 'Analizar Métricas',
        description: 'Rendimiento',
        prompt: 'Analiza las métricas de rendimiento de mis campañas',
        priority: 4,
      },
      {
        icon: UserCheck,
        label: 'Matching',
        description: 'Marca + Creador',
        prompt: 'Ayúdame a hacer matching entre marcas y creadores',
        priority: 5,
      },
      {
        icon: Lightbulb,
        label: 'Ideas de Contenido',
        description: 'Inspiración',
        prompt: 'Dame ideas de contenido trending para mi marca',
        priority: 6,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene la configuración de una zona.
 * Si la zona no existe, retorna la configuración 'general' como fallback.
 */
export function getZoneConfig(zone: KiroZone | string): ZoneConfig {
  if (zone in ZONE_CONFIGS) {
    return ZONE_CONFIGS[zone as KiroZone];
  }
  return ZONE_CONFIGS.general;
}

/**
 * Obtiene las acciones de una zona ordenadas por prioridad.
 */
export function getZoneActions(zone: KiroZone | string): ZoneAction[] {
  const config = getZoneConfig(zone);
  return [...config.actions].sort((a, b) => a.priority - b.priority);
}

/**
 * Obtiene el greeting de una zona.
 */
export function getZoneGreeting(zone: KiroZone | string): string {
  return getZoneConfig(zone).greeting;
}

/**
 * Obtiene el nombre y emoji de una zona formateados.
 */
export function getZoneDisplay(zone: KiroZone | string): { name: string; emoji: string; full: string } {
  const config = getZoneConfig(zone);
  return {
    name: config.zoneName,
    emoji: config.zoneEmoji,
    full: `${config.zoneEmoji} ${config.zoneName}`,
  };
}
