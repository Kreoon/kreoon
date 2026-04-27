import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  X, Calendar, Clock, DollarSign, Building2,
  FileVideo, FileImage, FileText, File,
  Upload, Check, MessageSquare, Send,
  Play, Download, Eye, RotateCcw,
  Star, Package, Zap,
  CheckCircle, XCircle, Loader2, ExternalLink,
  Mic, Gift, CheckCircle2, ArrowRight,
  AlertTriangle, UserPlus, CalendarPlus, Ban, Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { uploadAsset } from '@/lib/bunnyUpload';
import type { MarketplaceProject, ProjectStatus, KanbanColumnConfig } from '../types/marketplace';
import { ProjectAdapter } from '@/lib/projectAdapter';

// Unified Project Modal for marketplace projects
const UnifiedProjectModal = lazy(() => import('@/components/projects/UnifiedProjectModal'));

// ============================================================
// LOCAL TYPES (for data fetched inside the modal)
// ============================================================

interface Deliverable {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'video' | 'image' | 'document' | 'audio' | 'other';
  file_size_bytes: number | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: 'pending' | 'uploaded' | 'in_review' | 'revision_requested' | 'approved' | 'rejected';
  version: number;
  revision_notes: string | null;
  brand_feedback: string | null;
  approved_at: string | null;
  created_at: string;
}

// ============================================================
// PROPS
// ============================================================

interface ProjectDetailModalProps {
  project: MarketplaceProject;
  viewRole: 'brand' | 'creator' | 'editor';
  onClose: () => void;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
  columns: KanbanColumnConfig[];
}

// ============================================================
// CONSTANTS
// ============================================================

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}> = {
  pending: {
    label: 'Pendiente',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/15',
    icon: Clock,
    description: 'Esperando confirmacion del creador',
  },
  briefing: {
    label: 'En Brief',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/15',
    icon: FileText,
    description: 'Definiendo detalles del proyecto',
  },
  in_progress: {
    label: 'En Produccion',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/15',
    icon: Zap,
    description: 'El creador esta trabajando en el contenido',
  },
  revision: {
    label: 'En Revision',
    color: 'text-pink-300',
    bgColor: 'bg-pink-500/15',
    icon: Eye,
    description: 'Contenido enviado para revision',
  },
  approved: {
    label: 'Aprobado',
    color: 'text-green-300',
    bgColor: 'bg-green-500/15',
    icon: CheckCircle,
    description: 'Contenido aprobado',
  },
  completed: {
    label: 'Completado',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/15',
    icon: Check,
    description: 'Proyecto finalizado exitosamente',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-300',
    bgColor: 'bg-red-500/15',
    icon: XCircle,
    description: 'Proyecto cancelado',
  },
  overdue: {
    label: 'Vencido',
    color: 'text-red-300',
    bgColor: 'bg-red-500/15',
    icon: AlertTriangle,
    description: 'El proyecto ha superado la fecha limite',
  },
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: 'Pendiente',
  briefing: 'En Brief',
  in_progress: 'En Produccion',
  revision: 'En Revision',
  approved: 'Aprobado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  overdue: 'Vencido',
};

const DELIVERABLE_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-gray-400', bgColor: 'bg-white/5' },
  uploaded: { label: 'Subido', color: 'text-blue-300', bgColor: 'bg-blue-500/15' },
  in_review: { label: 'En Revision', color: 'text-cyan-300', bgColor: 'bg-cyan-500/15' },
  approved: { label: 'Aprobado', color: 'text-green-300', bgColor: 'bg-green-500/15' },
  rejected: { label: 'Rechazado', color: 'text-red-300', bgColor: 'bg-red-500/15' },
  revision_requested: { label: 'Cambios Solicitados', color: 'text-orange-300', bgColor: 'bg-orange-500/15' },
};

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  video: FileVideo,
  image: FileImage,
  audio: Mic,
  document: FileText,
  other: File,
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </div>
  );
}

function ProgressRing({ progress, size = 60, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function FileUploadZone({
  onFileSelect,
  isUploading,
}: {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-sm p-6 text-center transition-all cursor-pointer',
        isDragging
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-white/10 hover:border-purple-500/30 hover:bg-white/5',
      )}
    >
      <input
        type="file"
        accept="video/*,image/*,audio/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm text-gray-400">Subiendo archivo...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-sm bg-purple-500/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-foreground/80 text-sm font-medium">Arrastra tu archivo aqui</p>
          <p className="text-gray-600 text-xs">o haz clic para seleccionar</p>
        </div>
      )}
    </div>
  );
}

function DeliverableCard({
  deliverable,
  viewRole,
  onReview,
}: {
  deliverable: Deliverable;
  viewRole: 'brand' | 'creator' | 'editor';
  onReview?: (action: 'approved' | 'revision_requested', feedback?: string) => void;
}) {
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState('');

  const isVideo = deliverable.file_type === 'video';
  const isImage = deliverable.file_type === 'image';
  const FileIcon = FILE_TYPE_ICONS[deliverable.file_type] || File;
  const config = DELIVERABLE_STATUS_CONFIG[deliverable.status] || DELIVERABLE_STATUS_CONFIG.pending;

  return (
    <div className="bg-white/5 border border-white/5 rounded-sm overflow-hidden hover:border-white/10 transition-colors">
      {/* Preview */}
      <div className="relative aspect-video bg-black/30">
        {deliverable.thumbnail_url || (isImage && deliverable.file_url) ? (
          <img
            src={deliverable.thumbnail_url || deliverable.file_url}
            alt={deliverable.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileIcon className="w-10 h-10 text-gray-600" />
          </div>
        )}

        {isVideo && (
          <button
            onClick={() => window.open(deliverable.file_url, '_blank')}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </button>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', config.bgColor, config.color)}>
            {config.label}
          </span>
        </div>

        {/* Duration badge */}
        {deliverable.duration_seconds && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
            {Math.floor(deliverable.duration_seconds / 60)}:{String(deliverable.duration_seconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{deliverable.file_name}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
              {deliverable.file_size_bytes && (
                <span>{(deliverable.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
              )}
              <span>Version {deliverable.version}</span>
              <span>{formatDate(deliverable.created_at, 'relative')}</span>
            </div>
          </div>
          <a
            href={deliverable.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-sm transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>

        {/* Brand feedback */}
        {deliverable.brand_feedback && (
          <div className="mt-2 p-2 bg-orange-500/10 rounded-sm border border-orange-500/10">
            <p className="text-orange-300 text-xs">
              <strong>Feedback:</strong> {deliverable.brand_feedback}
            </p>
          </div>
        )}

        {/* Actions for brand/org when deliverable is uploaded/in_review */}
        {(viewRole === 'brand' || viewRole === 'organization' as any) &&
         (deliverable.status === 'uploaded' || deliverable.status === 'in_review') && (
          <div className="mt-3 space-y-2">
            {showFeedbackInput ? (
              <div className="space-y-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe los cambios que necesitas..."
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-purple-500"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onReview?.('revision_requested', feedback);
                      setShowFeedbackInput(false);
                      setFeedback('');
                    }}
                    className="flex-1 px-2 py-1.5 bg-orange-500/15 text-orange-300 rounded-sm text-xs font-medium hover:bg-orange-500/25 transition-colors"
                  >
                    Solicitar Cambios
                  </button>
                  <button
                    onClick={() => setShowFeedbackInput(false)}
                    className="px-2 py-1.5 text-gray-500 hover:bg-white/5 rounded-sm text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => onReview?.('approved')}
                  className="flex-1 flex items-center justify-center gap-1 bg-green-500/15 hover:bg-green-500/25 text-green-300 py-1.5 rounded-sm text-xs font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aprobar
                </button>
                <button
                  onClick={() => setShowFeedbackInput(true)}
                  className="flex-1 flex items-center justify-center gap-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 py-1.5 rounded-sm text-xs font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cambios
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProjectDetailModal({
  project,
  viewRole,
  onClose,
  onStatusChange,
  columns,
}: ProjectDetailModalProps) {
  // Always use the Unified Project Modal for marketplace projects
  const unifiedProject = ProjectAdapter.fromMarketplace(project);
  return (
    <Suspense fallback={null}>
      <UnifiedProjectModal
        source="marketplace"
        projectId={project.id}
        project={unifiedProject}
        open={true}
        onOpenChange={(open) => { if (!open) onClose(); }}
        onUpdate={() => {}}
      />
    </Suspense>
  );

  // Legacy marketplace modal code below (kept for reference, unreachable)
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'brief' | 'deliverables'>('overview');
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const statusConfig = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const currentColumn = columns.find(c => c.id === project.status);
  const allowedTransitions = currentColumn?.allowedTransitions || [];

  // Progress based on deliverables
  const progress = useMemo(() => {
    const total = project.deliverables_count || 1;
    const approved = project.deliverables_approved || 0;
    return (approved / total) * 100;
  }, [project.deliverables_count, project.deliverables_approved]);

  // Fetch deliverables
  const fetchDeliverables = useCallback(async () => {
    setDeliverablesLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('project_deliveries')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDeliverables(data);
      }
    } catch (err) {
      console.error('[ProjectDetailModal] Error fetching deliverables:', err);
    } finally {
      setDeliverablesLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  // Upload deliverable
  const handleFileUpload = async (file: File) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      // Upload to Bunny CDN
      const result = await uploadAsset(file, project.id);
      const publicUrl = result.cdnUrl;

      // Determine file type
      let fileType: 'video' | 'image' | 'audio' | 'document' | 'other' = 'other';
      if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.includes('pdf') || file.type.includes('document')) fileType = 'document';

      // Get max version
      const maxVersion = deliverables.length > 0
        ? Math.max(...deliverables.map(d => d.version))
        : 0;

      // Insert deliverable record
      const { error: insertError } = await (supabase as any)
        .from('project_deliveries')
        .insert({
          project_id: project.id,
          creator_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileType,
          file_size_bytes: file.size,
          status: 'uploaded',
          version: maxVersion + 1,
        });

      if (insertError) throw insertError;

      // Refresh deliverables
      await fetchDeliverables();
    } catch (err) {
      console.error('[ProjectDetailModal] Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Review deliverable (brand action)
  const handleDeliverableReview = async (deliverableId: string, action: 'approved' | 'revision_requested', feedback?: string) => {
    try {
      const update: Record<string, any> = {
        status: action,
        updated_at: new Date().toISOString(),
      };
      if (action === 'approved') {
        update.approved_at = new Date().toISOString();
        update.approved_by = user?.id;
      }
      if (feedback) {
        update.brand_feedback = feedback;
      }

      const { error } = await (supabase as any)
        .from('project_deliveries')
        .update(update)
        .eq('id', deliverableId);

      if (error) throw error;

      // Refresh deliverables
      await fetchDeliverables();
    } catch (err) {
      console.error('[ProjectDetailModal] Review error:', err);
    }
  };

  // Overdue action handler (brand only)
  const handleOverdueAction = async (action: 'extend' | 'reassign' | 'cancel') => {
    try {
      if (action === 'extend') {
        // Call extend_project_deadline RPC (adds 7 days by default)
        const { error } = await (supabase as any).rpc('extend_project_deadline', {
          p_project_id: project.id,
          p_extra_days: 7,
          p_reason: 'Plazo extendido por la marca',
        });
        if (error) throw error;
        onStatusChange(project.id, 'in_progress');
      } else if (action === 'reassign') {
        // Update overdue_action, the reassign flow will be handled separately
        const { error } = await (supabase as any)
          .from('marketplace_projects')
          .update({ overdue_action: 'reassign', updated_at: new Date().toISOString() })
          .eq('id', project.id);
        if (error) throw error;
      } else if (action === 'cancel') {
        const { error } = await (supabase as any)
          .from('marketplace_projects')
          .update({ overdue_action: 'cancel', status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', project.id);
        if (error) throw error;
        onStatusChange(project.id, 'cancelled');
      }
    } catch (err) {
      console.error('[ProjectDetailModal] Overdue action error:', err);
    }
  };

  const brief = project.brief;
  const approvedDeliverables = deliverables.filter(d => d.status === 'approved').length;
  const pendingReview = deliverables.filter(d => d.status === 'uploaded' || d.status === 'in_review').length;

  const TAB_ITEMS = [
    { id: 'overview' as const, label: 'Resumen', icon: Eye },
    { id: 'brief' as const, label: 'Brief', icon: FileText },
    { id: 'deliverables' as const, label: 'Entregables', icon: Package, badge: pendingReview },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-white/10 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* ========== HEADER ========== */}
        <div className="relative bg-gradient-to-br from-purple-600/80 via-purple-700/80 to-pink-600/80 text-white p-5 flex-shrink-0">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            {/* Progress Ring */}
            <div className="shrink-0">
              <div className="relative">
                <ProgressRing progress={progress} size={64} strokeWidth={4} />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-white/10 flex items-center justify-center">
                  <StatusIcon className={cn('w-3.5 h-3.5', statusConfig.color)} />
                </div>
              </div>
            </div>

            {/* Title and meta */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={project.status} />
                {project.payment_method === 'exchange' && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-[10px] font-medium flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    Canje
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold truncate">
                {brief.product_name || project.package_name || 'Proyecto'}
              </h2>

              <p className="text-white/60 text-xs mt-0.5">
                {statusConfig.description}
              </p>

              {/* Quick stats */}
              <div className="flex items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1 text-white/70">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="font-semibold">
                    {project.payment_method === 'exchange'
                      ? 'Canje'
                      : formatCurrency(project.total_price, project.currency)}
                  </span>
                </div>

                {project.deadline && (() => {
                  const dl = new Date(project.deadline);
                  const diffDays = Math.ceil((dl.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0 && project.status !== 'completed' && project.status !== 'cancelled';
                  const isUrgent = diffDays >= 0 && diffDays <= 3 && project.status !== 'completed' && project.status !== 'cancelled';
                  return (
                    <div className={cn('flex items-center gap-1', isOverdue ? 'text-red-300' : isUrgent ? 'text-amber-300' : 'text-white/70')}>
                      {isOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      <span>
                        {isOverdue
                          ? `Vencido ${Math.abs(diffDays)}d`
                          : dl.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-1 text-white/70">
                  <Package className="w-3.5 h-3.5" />
                  <span>{approvedDeliverables}/{project.deliverables_count || deliverables.length} entregables</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== TABS ========== */}
        <div className="px-4 py-2 bg-card border-b border-white/10 flex gap-1 flex-shrink-0">
          {TAB_ITEMS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm font-medium transition-all',
                  isActive
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-500 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    'text-[10px] w-4 h-4 rounded-full flex items-center justify-center',
                    isActive ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300',
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========== CONTENT ========== */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Status + allowed transitions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Estado:</span>
                  <span className="text-white font-semibold text-sm">{STATUS_LABELS[project.status]}</span>
                </div>
                {allowedTransitions.length > 0 && (
                  <div className="flex gap-2">
                    {allowedTransitions.map(status => (
                      <button
                        key={status}
                        onClick={() => onStatusChange(project.id, status)}
                        className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-sm transition-colors"
                      >
                        {STATUS_LABELS[status]}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="grid grid-cols-2 gap-3">
                {/* Brand / Org */}
                <div className="bg-white/5 rounded-sm p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Cliente</p>
                  <div className="flex items-center gap-2">
                    {project.brand_logo ? (
                      <img src={project.brand_logo} alt="" className="w-9 h-9 rounded-sm object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-sm bg-purple-500/15 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{project.brand_name || 'Cliente'}</p>
                    </div>
                  </div>
                </div>

                {/* Creator */}
                <div className="bg-white/5 rounded-sm p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Creador</p>
                  <div className="flex items-center gap-2">
                    {project.creator.avatar_url ? (
                      <img src={project.creator.avatar_url} alt="" className="w-9 h-9 rounded-sm object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-sm bg-cyan-500/15 flex items-center justify-center text-cyan-300 font-bold text-sm">
                        {project.creator.display_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{project.creator.display_name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-white">{project.creator.rating_avg.toFixed(1)}</span>
                        <span>({project.creator.rating_count})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment info */}
              <div className="bg-white/5 rounded-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {project.payment_method === 'exchange' ? (
                      <Gift className="h-5 w-5 text-green-400" />
                    ) : (
                      <DollarSign className="h-5 w-5 text-purple-400" />
                    )}
                    <span className="text-gray-400 text-sm">
                      {project.payment_method === 'exchange' ? 'Canje de producto' : 'Pago total'}
                    </span>
                  </div>
                  <span className="text-white font-bold">
                    {project.payment_method === 'exchange'
                      ? 'Sin costo'
                      : `${formatCurrency(project.total_price, project.currency)}`}
                  </span>
                </div>

                {/* Payment split breakdown */}
                {project.payment_method !== 'exchange' && (project.creator_payout || project.editor_payout || project.platform_fee) && (
                  <div className="border-t border-white/5 pt-2 space-y-1.5 text-xs">
                    {project.creator_payout != null && (
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Creador</span>
                        <span className="text-white">{formatCurrency(project.creator_payout, project.currency)}</span>
                      </div>
                    )}
                    {project.editor_payout != null && project.editor_payout > 0 && (
                      <div className="flex items-center justify-between text-gray-400">
                        <div className="flex items-center gap-1">
                          <Scissors className="h-3 w-3" />
                          <span>Editor</span>
                        </div>
                        <span className="text-white">{formatCurrency(project.editor_payout, project.currency)}</span>
                      </div>
                    )}
                    {project.platform_fee != null && (
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Comision Kreoon (15%)</span>
                        <span className="text-gray-500">{formatCurrency(project.platform_fee, project.currency)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editor info (when project requires editor) */}
              {project.requires_editor && (
                <div className="bg-white/5 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-foreground/80">Editor Asignado</span>
                  </div>
                  {project.editor_id ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-cyan-500/15 flex items-center justify-center text-cyan-300 font-bold text-xs">
                        E
                      </div>
                      <div>
                        <p className="text-white text-sm">Editor asignado</p>
                        <p className="text-gray-500 text-[10px]">ID: {project.editor_id.slice(0, 8)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">Pendiente de asignacion automatica</p>
                  )}
                </div>
              )}

              {/* Overdue alert + actions */}
              {project.status === 'overdue' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div>
                      <p className="text-red-300 text-sm font-semibold">Proyecto Vencido</p>
                      {project.overdue_at && (
                        <p className="text-red-400/70 text-[10px]">
                          Desde {new Date(project.overdue_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {project.overdue_notes && (
                    <p className="text-gray-400 text-xs bg-white/5 rounded-sm p-2">{project.overdue_notes}</p>
                  )}

                  {viewRole === 'brand' && !project.overdue_action && (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-xs">Selecciona una accion:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOverdueAction('extend')}
                          className="flex flex-col items-center gap-1 p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-sm transition-colors"
                        >
                          <CalendarPlus className="h-4 w-4 text-amber-400" />
                          <span className="text-amber-300 text-[10px] font-medium">Extender</span>
                        </button>
                        <button
                          onClick={() => handleOverdueAction('reassign')}
                          className="flex flex-col items-center gap-1 p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm transition-colors"
                        >
                          <UserPlus className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-300 text-[10px] font-medium">Reasignar</span>
                        </button>
                        <button
                          onClick={() => handleOverdueAction('cancel')}
                          className="flex flex-col items-center gap-1 p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-sm transition-colors"
                        >
                          <Ban className="h-4 w-4 text-red-400" />
                          <span className="text-red-300 text-[10px] font-medium">Cancelar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {project.overdue_action && (
                    <div className="bg-white/5 rounded-sm p-2 text-xs">
                      <span className="text-gray-500">Accion tomada: </span>
                      <span className="text-white font-medium">
                        {project.overdue_action === 'extend' ? 'Plazo extendido' :
                         project.overdue_action === 'reassign' ? 'Reasignado' : 'Cancelado'}
                      </span>
                      {project.deadline_extension_reason && (
                        <p className="text-gray-500 mt-1">{project.deadline_extension_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Deliverables summary */}
              <div className="bg-white/5 rounded-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Progreso de entregables</span>
                  <span className="text-white text-sm font-medium">
                    {approvedDeliverables}/{project.deliverables_count || deliverables.length}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{approvedDeliverables} aprobados</span>
                  <span>{pendingReview} pendientes de revision</span>
                  <span>{deliverables.filter(d => d.status === 'revision_requested').length} con cambios</span>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-foreground/80 mb-3">Historial</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center">
                      <StatusIcon className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{statusConfig.label}</p>
                      <p className="text-gray-600 text-[10px]">{formatDate(project.updated_at, 'relative')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">Proyecto creado</p>
                      <p className="text-gray-600 text-[10px]">{formatDate(project.created_at, 'relative')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BRIEF TAB */}
          {activeTab === 'brief' && (
            <div className="space-y-5">
              <div className="bg-white/5 rounded-sm p-4 space-y-3 text-sm">
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
                {brief.references.length > 0 && (
                  <div>
                    <span className="text-gray-500 block mb-1">Referencias:</span>
                    <div className="space-y-1">
                      {brief.references.map((ref, i) => (
                        <a
                          key={i}
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-400 text-xs hover:text-purple-300 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {ref.replace(/^https?:\/\//, '').split('/')[0]}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {brief.dos.length > 0 && (
                  <div>
                    <span className="text-gray-500 block mb-1">Que SI hacer:</span>
                    <ul className="space-y-1">
                      {brief.dos.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-foreground/80 text-xs">
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
                        <li key={i} className="flex items-start gap-1.5 text-foreground/80 text-xs">
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
                    <p className="text-foreground/80 text-xs">{brief.notes}</p>
                  </div>
                )}
              </div>

              {/* Empty brief state */}
              {!brief.product_name && !brief.objective && (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No hay brief disponible aun</p>
                </div>
              )}
            </div>
          )}

          {/* DELIVERABLES TAB */}
          {activeTab === 'deliverables' && (
            <div className="space-y-5">
              {/* Upload zone for creator */}
              {viewRole === 'creator' &&
               ['pending', 'briefing', 'in_progress', 'revision'].includes(project.status) && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground/80 mb-3">Subir Entregable</h3>
                  <FileUploadZone
                    onFileSelect={handleFileUpload}
                    isUploading={isUploading}
                  />
                </div>
              )}

              {/* Deliverables list */}
              {deliverablesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Cargando entregables...</p>
                </div>
              ) : deliverables.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-foreground/80 mb-3">
                    Entregables ({deliverables.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {deliverables.map(deliverable => (
                      <DeliverableCard
                        key={deliverable.id}
                        deliverable={deliverable}
                        viewRole={viewRole}
                        onReview={(action, feedback) =>
                          handleDeliverableReview(deliverable.id, action, feedback)
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No hay entregables aun</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {viewRole === 'creator'
                      ? 'Sube tu primer entregable arriba'
                      : 'Esperando que el creador suba contenido'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========== FOOTER ========== */}
        <div className="px-5 py-3 bg-card border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            <span>ID: {project.id.slice(0, 8)}</span>
            <span>Creado: {formatDate(project.created_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Creator: Send to revision button */}
            {viewRole === 'creator' && project.status === 'in_progress' && deliverables.length > 0 && (
              <button
                onClick={() => onStatusChange(project.id, 'revision')}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-sm text-xs font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar a Revision
              </button>
            )}

            {/* Brand: Approve project when all deliverables approved */}
            {(viewRole === 'brand') &&
             project.status === 'revision' &&
             deliverables.length > 0 &&
             deliverables.every(d => d.status === 'approved') && (
              <button
                onClick={() => onStatusChange(project.id, 'approved')}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-sm text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Aprobar Proyecto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
