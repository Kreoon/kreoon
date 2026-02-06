import {
  FileText,
  Globe,
  Target,
  Users,
  Swords,
  Gem,
  Crosshair,
  Trophy,
  Orbit,
  Magnet,
  CalendarDays,
  Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SectionConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  kiroPrompt: string;
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'executive-summary',
    label: 'Conclusion Ejecutiva',
    shortLabel: 'Conclusion',
    icon: FileText,
    kiroPrompt: 'Analiza la conclusion ejecutiva de este producto y dame recomendaciones adicionales basadas en los hallazgos clave.',
  },
  {
    id: 'market-overview',
    label: 'Panorama de Mercado',
    shortLabel: 'Mercado',
    icon: Globe,
    kiroPrompt: 'Profundiza en el analisis del mercado y dime que oportunidades no son tan evidentes a primera vista.',
  },
  {
    id: 'jtbd-analysis',
    label: 'Analisis JTBD',
    shortLabel: 'JTBD',
    icon: Target,
    kiroPrompt: 'Explicame los Jobs To Be Done y como puedo usarlos directamente en mi copy de ventas.',
  },
  {
    id: 'avatar-segmentation',
    label: 'Avatares Estrategicos',
    shortLabel: 'Avatares',
    icon: Users,
    kiroPrompt: 'Cual avatar tiene mas potencial de conversion y por que? Dame estrategias especificas para cada uno.',
  },
  {
    id: 'competition-analysis',
    label: 'Analisis de Competencia',
    shortLabel: 'Competencia',
    icon: Swords,
    kiroPrompt: 'Cual es la mayor vulnerabilidad de la competencia que puedo aprovechar en mi estrategia?',
  },
  {
    id: 'differentiation',
    label: 'Diferenciacion',
    shortLabel: 'Diferenciacion',
    icon: Gem,
    kiroPrompt: 'Como puedo comunicar mi diferenciacion de forma mas efectiva en mis anuncios y contenido?',
  },
  {
    id: 'sales-angles',
    label: 'Angulos de Venta',
    shortLabel: 'Angulos',
    icon: Crosshair,
    kiroPrompt: 'Cuales son los 3 angulos de venta mas potentes y como los aplico en diferentes plataformas?',
  },
  {
    id: 'puv-transformation',
    label: 'Propuesta de Valor',
    shortLabel: 'PUV',
    icon: Trophy,
    kiroPrompt: 'Como puedo mejorar mi propuesta unica de valor para que sea mas convincente y diferenciada?',
  },
  {
    id: 'strategic-playbook',
    label: 'Estrategia ESFERA',
    shortLabel: 'ESFERA',
    icon: Orbit,
    kiroPrompt: 'Ayudame a aplicar la estrategia ESFERA en un anuncio real para este producto.',
  },
  {
    id: 'lead-magnets',
    label: 'Leads y Creativos',
    shortLabel: 'Leads',
    icon: Magnet,
    kiroPrompt: 'Cual lead magnet tendria mayor conversion y como lo implemento paso a paso?',
  },
  {
    id: 'content-calendar',
    label: 'Parrilla de Contenido',
    shortLabel: 'Parrilla',
    icon: CalendarDays,
    kiroPrompt: 'Revisa mi parrilla de contenido y sugiere mejoras en la distribucion y los formatos.',
  },
  {
    id: 'launch-strategy',
    label: 'Estrategia de Lanzamiento',
    shortLabel: 'Lanzamiento',
    icon: Rocket,
    kiroPrompt: 'Dame un paso a paso detallado para ejecutar este lanzamiento con un equipo pequeno.',
  },
];
