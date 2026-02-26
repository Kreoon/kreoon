// ═══════════════════════════════════════════════════════════════════════
// UNLOCK ACCESS CONSTANTS v2 - Configuración y datos
// ═══════════════════════════════════════════════════════════════════════

export const CONFIG = {
  deadline: new Date('2025-04-30T23:59:59-05:00'),
  maxUsers: 500,
  packageValue: 497,
} as const;

export const KEYS = [
  {
    id: 1,
    name: 'Llave 1',
    subtitle: 'El comienzo',
    icon: '🗝️',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    rewards: [
      { icon: '⭐', text: '3 meses Creator Pro', value: '$72' },
      { icon: '🏷️', text: 'Badge verificado', value: 'Destacado' },
    ],
  },
  {
    id: 2,
    name: 'Llave 2',
    subtitle: 'El poder',
    icon: '📚',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    rewards: [
      { icon: '🤖', text: '18,000 tokens IA', value: '6K/mes' },
      { icon: '✨', text: 'Herramientas IA creativa', value: 'Pro' },
    ],
  },
  {
    id: 3,
    name: 'Llave 3',
    subtitle: 'La ventaja',
    icon: '⚡',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    rewards: [
      { icon: '📈', text: 'Posición privilegiada', value: 'Top' },
      { icon: '∞', text: 'Aplicaciones ilimitadas', value: 'Pro' },
    ],
  },
] as const;

export type KeyData = typeof KEYS[number];

export const KIRO_MESSAGES: Record<number, string[]> = {
  0: [
    "👋 ¡Hola! Ya hay marcas buscando talento...",
    "Invita 3 amigos y desbloquea 3 meses de Creator Pro gratis.",
    "El 30 de Abril esto abre para todos. ¿Vas a esperar?",
    "Los fundadores aparecen primero en las búsquedas.",
  ],
  1: [
    "🔑 ¡Primera llave! Ya casi tienes el badge verificado.",
    "Faltan 2 amigos. Estás más cerca de lo que crees.",
    "Tu primer referido ya está adentro. ¿Quién sigue?",
  ],
  2: [
    "🔑🔑 ¡Dos llaves! Solo falta UNA persona más.",
    "18,000 tokens IA y posición privilegiada casi son tuyos.",
    "Un mensaje más y desbloqueas todo.",
  ],
  3: [
    "🎉 ¡LO LOGRASTE! Ya eres fundador de KREOON.",
    "Tienes 3 meses de Creator Pro y posición destacada.",
    "Las marcas ya te están esperando. ¡A crear!",
  ],
};

export const SHARE_MESSAGES = [
  {
    id: 'casual',
    label: 'Casual',
    emoji: '💬',
    text: "Hey! Encontré esto para ganar dinero creando contenido. Si te unes con mi link, ambos ganamos beneficios ($497 valor). Es gratis:",
  },
  {
    id: 'urgent',
    label: 'Urgente',
    emoji: '🔥',
    text: "Esto cierra el 30 de abril y después perdemos los beneficios. Únete gratis con mi link:",
  },
  {
    id: 'direct',
    label: 'Directo',
    emoji: '💰',
    text: "¿Te interesa generar ingresos con contenido? Los primeros 500 tienen beneficios exclusivos. Link:",
  },
] as const;

export type ShareMessage = typeof SHARE_MESSAGES[number];

export const SHARE_PLATFORMS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: 'bg-green-500 hover:bg-green-600',
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    color: 'bg-blue-500 hover:bg-blue-600',
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'twitter',
    name: 'X',
    color: 'bg-neutral-800 hover:bg-neutral-700',
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: '¿Qué pasa si no consigo las 3 llaves?',
    answer: 'El 30 de Abril la plataforma abre para todos. Empiezas con plan básico gratuito, sin los beneficios exclusivos de fundador.',
  },
  {
    question: '¿Los beneficios son reales?',
    answer: 'Sí. Recibes 3 meses de Creator Pro (valor $72 USD), 18,000 tokens IA, badge verificado, posición destacada en búsquedas y aplicaciones ilimitadas a campañas.',
  },
  {
    question: '¿Mis referidos también pueden ganar?',
    answer: 'Sí, cada persona que invites puede hacer lo mismo y conseguir sus propias llaves. Todos ganan.',
  },
  {
    question: '¿Puedo invitar a cualquiera?',
    answer: 'Sí, pero deben ser cuentas reales de personas interesadas en crear contenido. Cuentas falsas o bots invalidan tu acceso.',
  },
  {
    question: '¿Cuándo puedo empezar a trabajar con marcas?',
    answer: 'Al desbloquear las 3 llaves ya hay marcas buscando talento. Con tu posición de fundador aparecerás primero en las búsquedas.',
  },
] as const;

export const FOMO_POINTS = [
  { icon: '📅', text: 'El 30 de Abril esto abre para TODOS' },
  { icon: '👥', text: 'Miles de creadores competirán por lo mismo' },
  { icon: '💨', text: 'Estos beneficios desaparecen después' },
  { icon: '🏃', text: 'Empezarás desde cero como el resto' },
] as const;

export const CHEST_REWARDS = [
  { icon: '⭐', text: '3 meses Creator Pro', value: '$72' },
  { icon: '🤖', text: '18,000 tokens IA', value: '6K/mes' },
  { icon: '✨', text: 'Herramientas IA creativa', value: 'Incluido' },
  { icon: '✓', text: 'Badge verificado', value: 'Destacado' },
  { icon: '📈', text: 'Posición privilegiada', value: 'Búsquedas' },
  { icon: '∞', text: 'Aplicaciones ilimitadas', value: 'Campañas' },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

export function getDaysRemaining(): number {
  const now = Date.now();
  const deadline = CONFIG.deadline.getTime();
  return Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
}

export function getTimeRemaining() {
  const now = Date.now();
  const deadline = CONFIG.deadline.getTime();
  const diff = Math.max(0, deadline - now);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: diff <= 0,
  };
}

export function isUrgent(): boolean {
  return getDaysRemaining() <= 7;
}

export function formatTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

// ═══════════════════════════════════════════════════════════════════════
// LEGACY ALIASES (for backward compatibility with v1 components)
// ═══════════════════════════════════════════════════════════════════════

import { Key, GraduationCap, Crown } from 'lucide-react';

export const EARLY_BIRD_DEADLINE = CONFIG.deadline;
export const PACKAGE_VALUE = CONFIG.packageValue;

// FOUNDER_KEYS with lucide icons (legacy format)
export const FOUNDER_KEYS = [
  {
    id: 1,
    name: 'El Acceso',
    icon: Key,
    color: 'from-amber-500 to-yellow-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    benefits: [
      { text: '3 meses Plan Creador Pro', value: '$45 USD' },
      { text: 'Badge exclusivo "Fundador 2025"', value: 'Unico' },
      { text: 'Acceso prioritario a campanas pagas', value: 'VIP' },
    ],
  },
  {
    id: 2,
    name: 'El Conocimiento',
    icon: GraduationCap,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    benefits: [
      { text: '1 mes "Los Reyes del Contenido"', value: '$97 USD' },
      { text: 'Bootcamp de lanzamiento exclusivo', value: 'Live' },
      { text: 'Certificacion Creador Verificado', value: 'Oficial' },
    ],
  },
  {
    id: 3,
    name: 'La Ventaja Perpetua',
    icon: Crown,
    color: 'from-emerald-500 to-teal-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    benefits: [
      { text: '200 tokens IA para contenido', value: '$20 USD' },
      { text: 'Comision referidos 25% PERPETUA', value: '+5%' },
      { text: 'Posicion top en ranking antiguedad', value: '#1-500' },
      { text: 'Acceso VIP campanas premium', value: 'Infinito' },
    ],
  },
] as const;

export type FounderKey = typeof FOUNDER_KEYS[number];

export const FOMO_CONSEQUENCES = [
  'El 30 de Abril la plataforma abre para TODOS',
  'Miles de creadores competiran por las mismas campanas',
  'Tu ventaja de fundador desaparece para siempre',
  'El dinero que pudiste ganar... sera de otros',
] as const;
