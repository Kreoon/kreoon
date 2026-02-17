import type { ProjectType, WorkflowState } from './unifiedProject.types';
import type { RoleId } from './roles';

// ============================================================
// WORKFLOW PHASE TYPES
// ============================================================

export interface WorkflowPhase {
  id: string;
  name: string;
  /** WorkflowState.key values that belong to this phase */
  stateIds: string[];
  roles: RoleId[];
  parallel: boolean;
  deliverableTypes: string[];
  nextPhase?: string;
}

export interface ProjectWorkflow {
  id: string;
  name: string;
  projectTypes: ProjectType[];
  phases: WorkflowPhase[];
}

// ============================================================
// WORKFLOW REGISTRY (3 predefined workflows)
// ============================================================

export const WORKFLOW_REGISTRY: Record<string, ProjectWorkflow> = {
  ugc_standard: {
    id: 'ugc_standard',
    name: 'UGC Estandar',
    projectTypes: ['content_creation'],
    phases: [
      {
        id: 'brief',
        name: 'Brief',
        stateIds: ['draft', 'script_pending', 'script_approved'],
        roles: ['content_strategist', 'brand_manager'],
        parallel: false,
        deliverableTypes: [],
        nextPhase: 'creation',
      },
      {
        id: 'creation',
        name: 'Creacion',
        stateIds: ['assigned', 'recording', 'recorded'],
        roles: ['ugc_creator', 'lifestyle_creator', 'photographer'],
        parallel: false,
        deliverableTypes: ['video', 'image'],
        nextPhase: 'post_prod',
      },
      {
        id: 'post_prod',
        name: 'Post-Prod',
        stateIds: ['editing'],
        roles: ['video_editor', 'motion_graphics', 'sound_designer'],
        parallel: true,
        deliverableTypes: ['video'],
        nextPhase: 'design',
      },
      {
        id: 'design',
        name: 'Diseno',
        stateIds: ['delivered'],
        roles: ['graphic_designer'],
        parallel: false,
        deliverableTypes: ['image', 'document'],
        nextPhase: 'review',
      },
      {
        id: 'review',
        name: 'Revision',
        stateIds: ['issue', 'corrected', 'review'],
        roles: ['content_strategist', 'brand_manager'],
        parallel: false,
        deliverableTypes: [],
        nextPhase: 'distribution',
      },
      {
        id: 'distribution',
        name: 'Distribucion',
        stateIds: ['approved'],
        roles: ['social_media_manager', 'trafficker'],
        parallel: true,
        deliverableTypes: [],
      },
    ],
  },

  tech_project: {
    id: 'tech_project',
    name: 'Proyecto Tecnologico',
    projectTypes: ['technology'],
    phases: [
      {
        id: 'planning',
        name: 'Planificacion',
        stateIds: ['pending', 'briefing'],
        roles: ['web_developer', 'app_developer'],
        parallel: false,
        deliverableTypes: ['document'],
        nextPhase: 'design',
      },
      {
        id: 'design',
        name: 'Diseno',
        stateIds: ['design'],
        roles: ['web_developer', 'app_developer'],
        parallel: false,
        deliverableTypes: ['document'],
        nextPhase: 'development',
      },
      {
        id: 'development',
        name: 'Desarrollo',
        stateIds: ['development'],
        roles: ['web_developer', 'app_developer', 'ai_specialist'],
        parallel: true,
        deliverableTypes: ['code'],
        nextPhase: 'testing',
      },
      {
        id: 'testing',
        name: 'Testing',
        stateIds: ['testing'],
        roles: ['web_developer', 'app_developer'],
        parallel: false,
        deliverableTypes: ['document'],
        nextPhase: 'deployment',
      },
      {
        id: 'deployment',
        name: 'Despliegue',
        stateIds: ['review', 'deployed', 'completed'],
        roles: ['web_developer', 'app_developer'],
        parallel: false,
        deliverableTypes: ['code'],
      },
    ],
  },

  strategy_project: {
    id: 'strategy_project',
    name: 'Proyecto Estrategico',
    projectTypes: ['strategy_marketing'],
    phases: [
      {
        id: 'discovery',
        name: 'Discovery',
        stateIds: ['pending', 'briefing'],
        roles: ['content_strategist', 'digital_strategist'],
        parallel: false,
        deliverableTypes: ['document'],
        nextPhase: 'research',
      },
      {
        id: 'research',
        name: 'Investigacion',
        stateIds: ['research'],
        roles: ['content_strategist', 'digital_strategist', 'seo_specialist'],
        parallel: true,
        deliverableTypes: ['document'],
        nextPhase: 'execution',
      },
      {
        id: 'execution',
        name: 'Ejecucion',
        stateIds: ['in_progress'],
        roles: ['social_media_manager', 'trafficker', 'email_marketer', 'growth_hacker'],
        parallel: true,
        deliverableTypes: ['report', 'campaign'],
        nextPhase: 'analysis',
      },
      {
        id: 'analysis',
        name: 'Analisis',
        stateIds: ['review', 'approved', 'completed'],
        roles: ['content_strategist', 'digital_strategist'],
        parallel: false,
        deliverableTypes: ['report'],
      },
    ],
  },
};

// ============================================================
// PROJECT TYPE → WORKFLOW MAPPING
// ============================================================

const PROJECT_TYPE_WORKFLOW_MAP: Partial<Record<ProjectType, string>> = {
  content_creation: 'ugc_standard',
  technology: 'tech_project',
  strategy_marketing: 'strategy_project',
};

// ============================================================
// HELPERS
// ============================================================

/** Generate a fallback workflow where each state becomes its own phase */
function generateFallbackWorkflow(type: ProjectType, states: WorkflowState[]): ProjectWorkflow {
  return {
    id: `${type}_fallback`,
    name: 'Workflow',
    projectTypes: [type],
    phases: states.map((s, i) => ({
      id: s.key,
      name: s.label,
      stateIds: [s.key],
      roles: [],
      parallel: false,
      deliverableTypes: [],
      nextPhase: states[i + 1]?.key,
    })),
  };
}

/** Get the workflow for a project type. Falls back to 1-state-per-phase. */
export function getWorkflowForType(type: ProjectType, states: WorkflowState[]): ProjectWorkflow {
  const registryKey = PROJECT_TYPE_WORKFLOW_MAP[type];
  if (registryKey && WORKFLOW_REGISTRY[registryKey]) {
    return WORKFLOW_REGISTRY[registryKey];
  }
  return generateFallbackWorkflow(type, states);
}

/** Find the index of the phase that contains the current status */
export function getCurrentPhaseIndex(workflow: ProjectWorkflow, status: string): number {
  return workflow.phases.findIndex(phase => phase.stateIds.includes(status));
}

/** Get indices of all phases completed before the current one */
export function getCompletedPhaseIndices(currentIndex: number): number[] {
  if (currentIndex <= 0) return [];
  return Array.from({ length: currentIndex }, (_, i) => i);
}
