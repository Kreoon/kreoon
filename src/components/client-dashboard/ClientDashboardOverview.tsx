import * as React from "react";
import { useState } from "react";
import { DollarSign, Video, CheckCircle2, Wallet, ArrowRight, Clock, AlertCircle, Ban, Play, Eye, AlertTriangle } from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Content, ContentStatus, STATUS_LABELS } from "@/types/database";
import { NovaKpiCard } from "./NovaKpiCard";
import { NovaAlertBanner } from "./NovaAlertBanner";
import { NovaActivityFeed } from "./NovaActivityFeed";
import { useClientActivityFeed } from "@/hooks/useClientActivityFeed";
import { Button } from "@/components/ui/button";
import { getBunnyVideoUrls } from "@/hooks/useHLSPlayer";
import { ClientVideoDetailSheet } from "./ClientVideoDetailSheet";
import { ClientPaymentModal } from "./ClientPaymentModal";

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  hooks_per_video: number;
  total_value: number;
  paid_amount: number;
  payment_status: string;
  payment_due_date: string | null;
  is_active: boolean;
}

interface ClientDashboardOverviewProps {
  clientName: string;
  userName?: string;
  userId?: string;
  content: Content[];
  packages: ClientPackage[];
  onVideoClick: (content: Content) => void;
  onViewAllContent: () => void;
  onUpdate?: () => void;
  hasExpiredPayment?: boolean;
  expiredAmount?: number;
  className?: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label?: string }> = {
  approved: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" },
  paid:     { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" },
  delivered:{ icon: Eye, color: "text-blue-400", bg: "bg-blue-500/20" },
  corrected:{ icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/20" },
};

function VideoThumbnailCard({
  video,
  onClick,
}: {
  video: Content;
  onClick: () => void;
}) {
  const urls = (() => {
    const list: string[] = [];
    if (video.bunny_embed_url) list.push(video.bunny_embed_url);
    if (video.video_url && !list.includes(video.video_url)) list.push(video.video_url);
    const extra = video.video_urls as string[] | null;
    if (extra) extra.filter(u => u?.trim() && !list.includes(u)).forEach(u => list.push(u));
    return list.filter(u => u?.trim());
  })();

  const firstUrl = urls[0] || "";
  const bunnyUrls = firstUrl ? getBunnyVideoUrls(firstUrl) : null;
  const thumbSrc = bunnyUrls?.thumbnail || video.thumbnail_url || null;

  const cfg = statusConfig[video.status] || { icon: Clock, color: "text-zinc-400", bg: "bg-zinc-500/20" };
  const StatusIcon = cfg.icon;
  const label = STATUS_LABELS[video.status as keyof typeof STATUS_LABELS] || video.status;
  const variantCount = urls.length;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] hover:border-purple-500/60 transition-colors"
    >
      {/* 9:16 aspect ratio */}
      <div className="aspect-[9/16] relative">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
            <Video className="h-8 w-8 text-zinc-400" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/20">
          <div className="p-2.5 rounded-full bg-white/90 shadow-lg">
            <Play className="h-5 w-5 text-zinc-900" fill="currentColor" />
          </div>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <div className={cn("p-1.5 rounded-lg", cfg.bg)}>
            <StatusIcon className={cn("h-3 w-3", cfg.color)} />
          </div>
        </div>

        {/* Variant count badge */}
        {variantCount > 1 && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
              {variantCount} var.
            </span>
          </div>
        )}

        {/* Title + status at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-xs font-medium text-zinc-100 line-clamp-2 leading-tight">{video.title}</p>
          <p className="text-[10px] text-zinc-300/80 mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ClientDashboardOverview({
  clientName,
  userName,
  userId,
  content,
  packages,
  onVideoClick,
  onViewAllContent,
  onUpdate,
  hasExpiredPayment = false,
  expiredAmount = 0,
  className,
}: ClientDashboardOverviewProps) {
  const [selectedVideo, setSelectedVideo] = useState<Content | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // KPIs
  const totalInvested = packages.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  const totalValue = packages.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
  const deliveredCount = content.filter(c => ['approved', 'paid'].includes(c.status)).length;

  const totalFinalVideos = packages.reduce((sum, p) => sum + ((p.content_quantity || 0) * (p.hooks_per_video || 1)), 0);
  const totalContentPromised = packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
  const costPerFinalVideo = totalFinalVideos > 0 ? totalValue / totalFinalVideos : 0;
  const avgHooksPerVideo = totalContentPromised > 0 ? totalFinalVideos / totalContentPromised : 1;
  const approvedVideosValue = deliveredCount * avgHooksPerVideo * costPerFinalVideo;
  const clientBalance = totalInvested - approvedVideosValue;

  const pendingToDeliver = Math.max(0, totalContentPromised - deliveredCount);
  const pendingPayment = Math.max(0, totalValue - totalInvested);

  const nextDueDate = packages
    .filter(p => p.payment_due_date && p.payment_status !== 'paid')
    .map(p => new Date(p.payment_due_date!))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;

  const getPaymentSubtitle = () => {
    if (pendingPayment === 0) return "al día";
    if (!nextDueDate) return "deuda pendiente";
    if (isPast(nextDueDate) && !isToday(nextDueDate)) return `vencido ${format(nextDueDate, "d MMM", { locale: es })}`;
    if (isToday(nextDueDate)) return "vence hoy";
    const daysLeft = differenceInDays(nextDueDate, new Date());
    if (daysLeft <= 7) return `vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`;
    return `vence ${format(nextDueDate, "d MMM", { locale: es })}`;
  };

  const getPaymentVariant = (): "success" | "warning" | "primary" | "info" => {
    if (pendingPayment === 0) return "success";
    if (!nextDueDate) return "warning";
    if (isPast(nextDueDate) && !isToday(nextDueDate)) return "warning";
    if (isToday(nextDueDate)) return "warning";
    return differenceInDays(nextDueDate, new Date()) <= 3 ? "warning" : "info";
  };

  // Entregados, corregidos, aprobados y archivados
  const recentVideos = [...content]
    .filter(c => ['delivered', 'corrected', 'approved', 'archived'].includes(c.status))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .slice(0, 9);

  const activities = useClientActivityFeed(content, 12);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const videoHeader = (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-zinc-900 dark:text-white">Videos Recientes</h3>
      <Button variant="ghost" size="sm" onClick={onViewAllContent} className="text-xs h-8 gap-1">
        Ver todos
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );

  const activityPanel = (maxItems: number, extraClass?: string) => (
    <div className={cn("rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] p-2", extraClass)}>
      <NovaActivityFeed
        activities={activities}
        maxItems={maxItems}
        onActivityClick={(activity) => {
          const video = content.find(c => c.id === activity.contentId);
          if (video) onVideoClick(video);
        }}
      />
    </div>
  );

  const emptyState = (tall: boolean) => (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 gap-2",
      tall ? "py-14" : "py-10"
    )}>
      <CheckCircle2 className={cn("text-zinc-400", tall ? "h-10 w-10" : "h-8 w-8")} />
      <p className="text-sm text-zinc-500">Sin videos pendientes</p>
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Welcome Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {getGreeting()}, {userName?.split(' ')[0] || 'Cliente'}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Resumen de tu cuenta en {clientName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <NovaKpiCard title="Pagado" value={totalInvested} prefix="$" icon={DollarSign} variant="success" subtitle={`de $${totalValue.toLocaleString()} total`} />
        <NovaKpiCard title="Por Pagar" value={pendingPayment} prefix="$" icon={AlertCircle} variant={getPaymentVariant()} subtitle={getPaymentSubtitle()} />
        <NovaKpiCard title="Por Entregar" value={pendingToDeliver} icon={Clock} variant={pendingToDeliver > 0 ? "warning" : "success"} subtitle={`de ${totalContentPromised} prometidos`} />
        <NovaKpiCard title="Entregados" value={deliveredCount} icon={CheckCircle2} variant="info" subtitle="videos aprobados" />
        <NovaKpiCard
          title={clientBalance >= 0 ? "Saldo a Favor" : "Saldo Pendiente"}
          value={Math.abs(Math.round(clientBalance))}
          prefix={clientBalance >= 0 ? "+$" : "-$"}
          icon={Wallet}
          variant={clientBalance >= 0 ? "success" : "warning"}
          subtitle={clientBalance >= 0 ? "crédito disponible" : "por regularizar"}
        />
      </div>

      {/* Banner pagos vencidos */}
      {hasExpiredPayment && (
        <div className="rounded-lg border-2 border-red-500 p-4 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
              <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-200 text-base">Descargas suspendidas</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Tienes <strong>${expiredAmount.toLocaleString()}</strong> en pagos vencidos. Regulariza tu situación para habilitar las descargas.
              </p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-100"
              >
                Pagar ahora →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert pago pendiente */}
      {pendingPayment > 0 && !hasExpiredPayment && (
        <NovaAlertBanner
          type={nextDueDate && isPast(nextDueDate) && !isToday(nextDueDate) ? "warning" : "review"}
          title={
            nextDueDate && isPast(nextDueDate) && !isToday(nextDueDate) ? "Pago vencido"
              : nextDueDate && isToday(nextDueDate) ? "Pago vence hoy"
              : "Pago pendiente"
          }
          description={
            nextDueDate
              ? `Tienes $${pendingPayment.toLocaleString()} pendientes${
                  isPast(nextDueDate) && !isToday(nextDueDate)
                    ? ` (venció el ${format(nextDueDate, "d 'de' MMMM", { locale: es })})`
                    : isToday(nextDueDate) ? " que vencen hoy"
                    : ` (vence el ${format(nextDueDate, "d 'de' MMMM", { locale: es })})`
                }`
              : `Tienes $${pendingPayment.toLocaleString()} pendientes de pago`
          }
          actionLabel="Ver detalles"
          onAction={() => setShowPaymentModal(true)}
        />
      )}

      {/* ── MÓVIL: videos en grid 2 col + activity abajo ── */}
      <div className="md:hidden space-y-4">
        <div>
          {videoHeader}
          {recentVideos.length === 0 ? emptyState(false) : (
            <div className="grid grid-cols-2 gap-3">
              {recentVideos.slice(0, 4).map(video => (
                <VideoThumbnailCard
                  key={video.id}
                  video={video}
                  onClick={() => setSelectedVideo(video)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Actividad Reciente</h3>
          {activityPanel(8)}
        </div>
      </div>

      {/* ── TABLET / DESKTOP: 2/3 videos + 1/3 activity ── */}
      <div className="hidden md:flex md:gap-4 items-start">
        {/* Videos — 2/3 */}
        <div className="flex-[2] min-w-0">
          {videoHeader}
          {recentVideos.length === 0 ? emptyState(true) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {recentVideos.map(video => (
                <VideoThumbnailCard
                  key={video.id}
                  video={video}
                  onClick={() => setSelectedVideo(video)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Activity — 1/3 */}
        <div className="flex-1 flex flex-col min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Actividad Reciente</h3>
          {activityPanel(15, "flex-1 overflow-y-auto")}
        </div>
      </div>

      {/* Payment Modal */}
      <ClientPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        packages={packages}
        clientName={clientName}
      />

      {/* Video Detail Sheet */}
      <ClientVideoDetailSheet
        content={selectedVideo}
        userId={userId}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onUpdate={() => {
          onUpdate?.();
          setSelectedVideo(null);
        }}
      />
    </div>
  );
}
