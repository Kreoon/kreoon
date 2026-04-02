import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Star,
  ChevronRight,
  GitBranch,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrgPipelines,
  useDeleteOrgPipeline,
  useUpdateOrgPipeline,
  useOrgContacts,
} from '@/hooks/useCrm';
import { CreatePipelineModal } from './CreatePipelineModal';
import type { OrgPipeline } from '@/types/crm.types';
import { PIPELINE_TYPE_LABELS } from '@/types/crm.types';

// =====================================================
// Pipeline Card
// =====================================================

interface PipelineCardProps {
  pipeline: OrgPipeline;
  contactCountByStage: Record<string, number>;
  onSelect: (p: OrgPipeline) => void;
  onEdit: (p: OrgPipeline) => void;
  onDelete: (id: string) => void;
  onMakeDefault: (p: OrgPipeline) => void;
}

function PipelineCard({
  pipeline,
  contactCountByStage,
  onSelect,
  onEdit,
  onDelete,
  onMakeDefault,
}: PipelineCardProps) {
  const sortedStages = useMemo(
    () => [...(pipeline.stages || [])].sort((a, b) => a.order - b.order),
    [pipeline.stages],
  );
  const totalContacts = Object.values(contactCountByStage).reduce((a, b) => a + b, 0);

  return (
    <div
      className="group rounded-sm p-4 cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: pipeline.is_default
          ? '1px solid rgba(139, 92, 246, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: pipeline.is_default
          ? '0 0 20px rgba(139, 92, 246, 0.08)'
          : 'none',
      }}
      onClick={() => onSelect(pipeline)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{pipeline.name}</h3>
            {pipeline.is_default && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#8b5cf6]/20 text-[#a855f7]">
                <Star className="h-2.5 w-2.5" />
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {PIPELINE_TYPE_LABELS[pipeline.pipeline_type || 'custom']}
            {' · '}
            {sortedStages.length} stages
            {totalContacts > 0 && ` · ${totalContacts} contactos`}
          </p>
        </div>

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!pipeline.is_default && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMakeDefault(pipeline);
              }}
              className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-yellow-400 transition-colors"
              title="Hacer default"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(pipeline);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pipeline.id);
            }}
            className="p-1.5 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stage preview bar */}
      <div className="flex items-center gap-1">
        {sortedStages.map((stage, i) => (
          <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className="h-1.5 rounded-full flex-1"
              style={{ backgroundColor: stage.color || '#8B5CF6', opacity: 0.6 }}
            />
            {i < sortedStages.length - 1 && (
              <ChevronRight className="h-2.5 w-2.5 text-white/10 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Stage names preview */}
      <div className="flex items-center gap-1 mt-2 overflow-hidden">
        {sortedStages.slice(0, 5).map((stage, i) => (
          <span
            key={i}
            className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate"
            style={{
              backgroundColor: (stage.color || '#8B5CF6') + '20',
              color: stage.color || '#8B5CF6',
            }}
          >
            {stage.name}
          </span>
        ))}
        {sortedStages.length > 5 && (
          <span className="text-[9px] text-white/30">+{sortedStages.length - 5}</span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Pipeline Detail View (stages as columns)
// =====================================================

interface PipelineDetailProps {
  pipeline: OrgPipeline;
  contactCountByStage: Record<string, number>;
  onBack: () => void;
  onEdit: (p: OrgPipeline) => void;
}

function PipelineDetail({ pipeline, contactCountByStage, onBack, onEdit }: PipelineDetailProps) {
  const sortedStages = useMemo(
    () => [...(pipeline.stages || [])].sort((a, b) => a.order - b.order),
    [pipeline.stages],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white truncate">{pipeline.name}</h3>
            {pipeline.is_default && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#8b5cf6]/20 text-[#a855f7]">
                <Star className="h-2.5 w-2.5" />
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">
            {PIPELINE_TYPE_LABELS[pipeline.pipeline_type || 'custom']}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(pipeline)}
          className="h-8 text-xs text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/10"
        >
          <Edit className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
      </div>

      {/* Stages as columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sortedStages.map((stage, i) => {
          const count = contactCountByStage[stage.name] || 0;
          return (
            <div
              key={i}
              className="flex-shrink-0 w-48 rounded-sm overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Column header */}
              <div
                className="px-3 py-2.5 flex items-center justify-between"
                style={{
                  borderBottom: `2px solid ${stage.color || '#8B5CF6'}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color || '#8B5CF6' }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {stage.name}
                  </span>
                </div>
                <span className="text-[10px] text-white/30 font-mono flex-shrink-0 ml-2">
                  {count}
                </span>
              </div>

              {/* Column body */}
              <div className="px-3 py-3 min-h-[80px]">
                {count > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Users className="h-3.5 w-3.5" />
                    <span>{count} contacto{count !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/20 text-center py-4">
                    Sin contactos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

interface PipelineManagerProps {
  organizationId: string;
}

export function PipelineManager({ organizationId }: PipelineManagerProps) {
  const { data: pipelines = [], isLoading } = useOrgPipelines(organizationId);
  const deletePipeline = useDeleteOrgPipeline(organizationId);
  const updatePipeline = useUpdateOrgPipeline(organizationId);
  const { data: contacts = [] } = useOrgContacts(organizationId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editPipeline, setEditPipeline] = useState<OrgPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<OrgPipeline | null>(null);

  // Count contacts per stage
  const contactCountByStage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of contacts) {
      if (c.pipeline_stage) {
        map[c.pipeline_stage] = (map[c.pipeline_stage] || 0) + 1;
      }
    }
    return map;
  }, [contacts]);

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este pipeline? Los contactos no se eliminarán.')) return;
    deletePipeline.mutate(id, {
      onSuccess: () => {
        if (selectedPipeline?.id === id) setSelectedPipeline(null);
      },
    });
  };

  const handleMakeDefault = (pipeline: OrgPipeline) => {
    updatePipeline.mutate(
      { id: pipeline.id, data: { is_default: true } },
      {
        onSuccess: () => toast.success(`"${pipeline.name}" es ahora el pipeline por defecto`),
      },
    );
  };

  const handleEdit = (pipeline: OrgPipeline) => {
    setEditPipeline(pipeline);
    setShowCreateModal(true);
  };

  const handleCloseModal = (open: boolean) => {
    setShowCreateModal(open);
    if (!open) setEditPipeline(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-white/5" />
          <Skeleton className="h-9 w-36 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-sm bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedPipeline) {
    // Re-find from fresh data in case stages were edited
    const fresh = pipelines.find((p) => p.id === selectedPipeline.id);
    if (!fresh) {
      setSelectedPipeline(null);
      return null;
    }
    return (
      <>
        <PipelineDetail
          pipeline={fresh}
          contactCountByStage={contactCountByStage}
          onBack={() => setSelectedPipeline(null)}
          onEdit={handleEdit}
        />
        <CreatePipelineModal
          open={showCreateModal}
          onOpenChange={handleCloseModal}
          organizationId={organizationId}
          editPipeline={editPipeline}
        />
      </>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#a855f7]" />
            Pipelines ({pipelines.length})
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Gestiona los flujos de trabajo de tu organización
          </p>
        </div>
        <Button
          onClick={() => {
            setEditPipeline(null);
            setShowCreateModal(true);
          }}
          className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Pipeline
        </Button>
      </div>

      {/* Pipeline Grid */}
      {pipelines.length === 0 ? (
        <div className="text-center py-16">
          <GitBranch className="h-12 w-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">No hay pipelines configurados</p>
          <p className="text-xs text-white/20 mt-1">
            Crea tu primer pipeline para organizar tus contactos
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear primer pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              contactCountByStage={contactCountByStage}
              onSelect={setSelectedPipeline}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMakeDefault={handleMakeDefault}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreatePipelineModal
        open={showCreateModal}
        onOpenChange={handleCloseModal}
        organizationId={organizationId}
        editPipeline={editPipeline}
      />
    </div>
  );
}
