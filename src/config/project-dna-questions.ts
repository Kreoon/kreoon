import type { ProjectType } from '@/types/unifiedProject.types';

// ============================================================
// TYPES
// ============================================================

export interface ProjectDNAWrittenQuestion {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder: string;
  required?: boolean;
}

export interface ProjectDNAConfig {
  writtenQuestions: ProjectDNAWrittenQuestion[];
  audioGuidePoints: string[];
  audioDescription: string;
}

// ============================================================
// QUESTIONS PER PROJECT TYPE
// ============================================================

export const PROJECT_DNA_QUESTIONS: Record<ProjectType, ProjectDNAConfig> = {
  // ── Content Creation ──────────────────────────────────────
  content_creation: {
    writtenQuestions: [
      {
        key: 'product_name_url',
        label: 'Producto / URL',
        type: 'text',
        placeholder: 'Ej: Kreoon - https://kreoon.com',
        required: true,
      },
      {
        key: 'content_objective',
        label: 'Objetivo del contenido',
        type: 'textarea',
        placeholder: 'Que quieres lograr con este contenido...',
        required: true,
      },
      {
        key: 'desired_tone',
        label: 'Tono deseado',
        type: 'text',
        placeholder: 'Ej: Profesional, casual, divertido, inspiracional...',
      },
    ],
    audioGuidePoints: [
      'Cuentanos sobre el producto o servicio',
      'Quien es tu audiencia ideal',
      'Que resultado esperas del contenido',
      'Referencias o inspiraciones que te gustan',
      'Que NO deberia tener el contenido',
    ],
    audioDescription: 'Graba un audio de 1-3 minutos explicando tu vision para este contenido.',
  },

  // ── Post-Production ───────────────────────────────────────
  post_production: {
    writtenQuestions: [
      {
        key: 'source_material',
        label: 'Material fuente',
        type: 'textarea',
        placeholder: 'Describe el material que se va a editar...',
        required: true,
      },
      {
        key: 'editing_style',
        label: 'Estilo de edicion',
        type: 'text',
        placeholder: 'Ej: Cinematografico, dinamico, minimalista...',
      },
      {
        key: 'output_format',
        label: 'Formato de salida',
        type: 'text',
        placeholder: 'Ej: 9:16 vertical, 16:9 horizontal, multiple...',
      },
    ],
    audioGuidePoints: [
      'Describe el material que tienes para editar',
      'El estilo visual que quieres lograr',
      'Que sensacion o emocion debe transmitir',
      'Referencias de edicion que te gustan',
      'Plazos y prioridades del proyecto',
    ],
    audioDescription: 'Graba un audio de 1-3 minutos describiendo tu vision para la edicion.',
  },

  // ── Strategy & Marketing ──────────────────────────────────
  strategy_marketing: {
    writtenQuestions: [
      {
        key: 'business_objective',
        label: 'Objetivo de negocio',
        type: 'textarea',
        placeholder: 'Que quieres lograr con esta estrategia...',
        required: true,
      },
      {
        key: 'main_kpis',
        label: 'KPIs principales',
        type: 'text',
        placeholder: 'Ej: Leads, ventas, engagement, alcance...',
      },
      {
        key: 'estimated_budget',
        label: 'Presupuesto estimado',
        type: 'text',
        placeholder: 'Ej: $500 USD mensuales',
      },
    ],
    audioGuidePoints: [
      'Tu situacion actual de marketing',
      'Quien es tu cliente ideal',
      'En que canales estas presente',
      'Que te ha funcionado y que no',
      'Que resultados esperas y en cuanto tiempo',
    ],
    audioDescription: 'Graba un audio de 1-3 minutos explicando tu situacion y objetivos de marketing.',
  },

  // ── Technology ────────────────────────────────────────────
  technology: {
    writtenQuestions: [
      {
        key: 'tech_stack',
        label: 'Tech stack',
        type: 'text',
        placeholder: 'Ej: React, Node.js, PostgreSQL...',
        required: true,
      },
      {
        key: 'repository_url',
        label: 'URL del repositorio',
        type: 'text',
        placeholder: 'https://github.com/...',
      },
      {
        key: 'main_specs',
        label: 'Especificaciones principales',
        type: 'textarea',
        placeholder: 'Requisitos funcionales y tecnicos clave...',
        required: true,
      },
    ],
    audioGuidePoints: [
      'Que quieres construir y por que',
      'Quienes son los usuarios y que escala esperas',
      'Integraciones o APIs necesarias',
      'Criterios de aceptacion del proyecto',
      'Timeline y prioridades',
    ],
    audioDescription: 'Graba un audio de 1-3 minutos describiendo el proyecto tecnico.',
  },

  // ── Education ─────────────────────────────────────────────
  education: {
    writtenQuestions: [
      {
        key: 'course_topic',
        label: 'Tema del curso',
        type: 'text',
        placeholder: 'Tema principal del curso o taller...',
        required: true,
      },
      {
        key: 'target_level',
        label: 'Nivel del publico',
        type: 'text',
        placeholder: 'Ej: Principiante, intermedio, avanzado...',
      },
      {
        key: 'target_platform',
        label: 'Plataforma objetivo',
        type: 'text',
        placeholder: 'Ej: YouTube, Udemy, Kreoon Academy...',
      },
    ],
    audioGuidePoints: [
      'Que conocimiento quieres transmitir',
      'A quien va dirigido el curso',
      'Formato preferido (video, texto, interactivo)',
      'Duracion estimada del curso',
      'Como evaluaras el aprendizaje',
    ],
    audioDescription: 'Graba un audio de 1-3 minutos explicando tu vision para el curso.',
  },
};
