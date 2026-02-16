import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { UnifiedTabProps } from '../types';
import type { WorkspaceType } from '@/types/unifiedProject.types';

// Lazy load workspace components
const ScriptWorkspace = lazy(() => import('../workspaces/ScriptWorkspace'));
const ChecklistWorkspace = lazy(() => import('../workspaces/ChecklistWorkspace'));
const DocumentWorkspace = lazy(() => import('../workspaces/DocumentWorkspace'));
const TechnicalWorkspace = lazy(() => import('../workspaces/TechnicalWorkspace'));
const CurriculumWorkspace = lazy(() => import('../workspaces/CurriculumWorkspace'));

const WORKSPACE_COMPONENTS: Record<WorkspaceType, React.LazyExoticComponent<any>> = {
  script: ScriptWorkspace,
  checklist: ChecklistWorkspace,
  document: DocumentWorkspace,
  technical: TechnicalWorkspace,
  curriculum: CurriculumWorkspace,
};

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function WorkspaceTab(props: UnifiedTabProps) {
  const { typeConfig } = props;
  const WorkspaceComponent = WORKSPACE_COMPONENTS[typeConfig.sections.workspace.type];

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceComponent {...props} />
    </Suspense>
  );
}
