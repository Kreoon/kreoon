import { useState } from 'react';
import { X, FileText, MessageSquare, Package, Star, CheckCircle2, Gift, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectChatPanel } from '../chat/ProjectChatPanel';
import type { MarketplaceProject, ProjectStatus, KanbanColumnConfig } from '../types/marketplace';

interface ProjectDetailModalProps {
  project: MarketplaceProject;
  viewRole: 'brand' | 'creator' | 'editor';
  onClose: () => void;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
  columns: KanbanColumnConfig[];
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Produccion',
  revision: 'En Revision',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const TAB_ITEMS = [
  { id: 'summary', label: 'Resumen', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'deliverables', label: 'Entregables', icon: Package },
] as const;

type TabId = (typeof TAB_ITEMS)[number]['id'];

export function ProjectDetailModal({
  project,
  viewRole,
  onClose,
  onStatusChange,
  columns,
}: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const currentColumn = columns.find(c => c.id === project.status);
  const allowedTransitions = currentColumn?.allowedTransitions || [];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-[#0f0f1a] border-l border-white/10 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-sm border-b border-white/10 z-10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {project.creator.avatar_url ? (
                <img
                  src={project.creator.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/50 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold flex-shrink-0">
                  {project.creator.display_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-white font-semibold truncate">{project.brief.product_name}</h2>
                <p className="text-gray-500 text-xs">
                  {project.creator.display_name} — {project.brand_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TAB_ITEMS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.id === 'chat' && project.unread_messages > 0 && (
                    <span className="bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {project.unread_messages}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 py-6">
          {activeTab === 'summary' && (
            <SummaryTab
              project={project}
              viewRole={viewRole}
              allowedTransitions={allowedTransitions}
              onStatusChange={onStatusChange}
            />
          )}
          {activeTab === 'chat' && (
            <ProjectChatPanel
              projectId={project.id}
              currentUserId={viewRole === 'brand' ? project.brand_user_id : project.creator.user_id}
              currentUserRole={viewRole}
            />
          )}
          {activeTab === 'deliverables' && (
            <DeliverablesTab project={project} />
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTab({
  project,
  viewRole,
  allowedTransitions,
  onStatusChange,
}: {
  project: MarketplaceProject;
  viewRole: string;
  allowedTransitions: ProjectStatus[];
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
}) {
  const brief = project.brief;

  return (
    <div className="space-y-6">
      {/* Status + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Estado:</span>
          <span className="text-white font-semibold">{STATUS_LABELS[project.status]}</span>
        </div>
        {allowedTransitions.length > 0 && (
          <div className="flex gap-2">
            {allowedTransitions.map(status => (
              <button
                key={status}
                onClick={() => onStatusChange(project.id, status)}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {STATUS_LABELS[status]}
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment info */}
      <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {project.payment_method === 'exchange' ? (
            <Gift className="h-5 w-5 text-green-400" />
          ) : (
            <DollarSign className="h-5 w-5 text-purple-400" />
          )}
          <span className="text-gray-400 text-sm">
            {project.payment_method === 'exchange' ? 'Canje de producto' : 'Pago con Escrow'}
          </span>
        </div>
        <span className="text-white font-bold">
          {project.payment_method === 'exchange'
            ? 'Sin costo'
            : `$${project.total_price.toLocaleString()} ${project.currency}`}
        </span>
      </div>

      {/* Creator / Brand info */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          {viewRole === 'brand' ? 'Creador' : 'Marca'}
        </h3>
        <div className="flex items-center gap-3">
          <img
            src={viewRole === 'brand' ? project.creator.avatar_url || '' : project.brand_logo || ''}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="text-white font-medium text-sm">
              {viewRole === 'brand' ? project.creator.display_name : project.brand_name}
            </p>
            {viewRole === 'brand' && (
              <div className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 text-purple-400 fill-purple-400" />
                <span className="text-white">{project.creator.rating_avg.toFixed(1)}</span>
                <span className="text-gray-500">({project.creator.rating_count})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Brief details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Brief del proyecto</h3>
        <div className="bg-white/5 rounded-xl p-4 space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Producto:</span>
            <span className="text-white ml-2">{brief.product_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Objetivo:</span>
            <span className="text-white ml-2">{brief.objective}</span>
          </div>
          {brief.target_audience && (
            <div>
              <span className="text-gray-500">Audiencia:</span>
              <span className="text-white ml-2">{brief.target_audience}</span>
            </div>
          )}
          {brief.tone && (
            <div>
              <span className="text-gray-500">Tono:</span>
              <span className="text-white ml-2">{brief.tone}</span>
            </div>
          )}
          {brief.key_messages.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">Mensajes clave:</span>
              <div className="flex flex-wrap gap-1.5">
                {brief.key_messages.map((msg, i) => (
                  <span key={i} className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {msg}
                  </span>
                ))}
              </div>
            </div>
          )}
          {brief.dos.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">Que SI hacer:</span>
              <ul className="space-y-1">
                {brief.dos.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-gray-300 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.donts.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">Que NO hacer:</span>
              <ul className="space-y-1">
                {brief.donts.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-gray-300 text-xs">
                    <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">Fecha limite:</span>
              <span className="text-white">{new Date(brief.deadline).toLocaleDateString('es-CO')}</span>
            </div>
          )}
          {brief.notes && (
            <div>
              <span className="text-gray-500 block mb-1">Notas:</span>
              <p className="text-gray-300 text-xs">{brief.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Package */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Paquete</h3>
        <p className="text-white font-medium">{project.package_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-500 text-xs">Entregables:</span>
          <span className="text-white text-xs">
            {project.deliverables_approved}/{project.deliverables_count} aprobados
          </span>
        </div>
      </div>
    </div>
  );
}

function DeliverablesTab({ project }: { project: MarketplaceProject }) {
  return (
    <div className="text-center py-12 space-y-4">
      <Package className="h-12 w-12 text-gray-600 mx-auto" />
      <div>
        <h3 className="text-white font-semibold">Entregables</h3>
        <p className="text-gray-500 text-sm mt-1">
          {project.deliverables_approved}/{project.deliverables_count} entregables aprobados
        </p>
      </div>
      <p className="text-gray-600 text-xs max-w-sm mx-auto">
        La gestion de entregables (subir archivos, aprobar, pedir cambios) estara disponible proximamente.
      </p>
    </div>
  );
}
