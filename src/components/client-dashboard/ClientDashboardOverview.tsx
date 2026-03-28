import * as React from "react";
import { DollarSign, Video, CheckCircle2, Wallet, ArrowRight, Clock, AlertCircle, Ban } from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Content } from "@/types/database";

function getThumbnailUrl(content: Content): string | null {
  if (content.thumbnail_url && !content.thumbnail_url.includes('iframe.mediadelivery.net')) {
    return content.thumbnail_url;
  }
  const videoUrl = (content.video_urls as string[] | undefined)?.find(u => u?.trim())
    || content.video_url
    || content.bunny_embed_url
    || '';
  const embedMatch = videoUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
  if (embedMatch) {
    return `https://vz-${embedMatch[1]}.b-cdn.net/${embedMatch[2]}/thumbnail.jpg`;
  }
  return null;
}
import { NovaKpiCard } from "./NovaKpiCard";
import { NovaAlertBanner } from "./NovaAlertBanner";
import { NovaVerticalVideoGrid } from "./NovaVerticalVideoGrid";
import { NovaActivityFeed } from "./NovaActivityFeed";
import { useClientActivityFeed } from "@/hooks/useClientActivityFeed";
import { Button } from "@/components/ui/button";

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
  content: Content[];
  packages: ClientPackage[];
  onVideoClick: (content: Content) => void;
  onViewAllContent: () => void;
  hasExpiredPayment?: boolean;
  expiredAmount?: number;
  className?: string;
}

export function ClientDashboardOverview({
  clientName,
  userName,
  content,
  packages,
  onVideoClick,
  onViewAllContent,
  hasExpiredPayment = false,
  expiredAmount = 0,
  className,
}: ClientDashboardOverviewProps) {
  // Calculate KPIs
  const totalInvested = packages.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
  const totalValue = packages.reduce((sum, p) => sum + Number(p.total_value || 0), 0);
  const totalContent = content.length;
  const deliveredCount = content.filter(c =>
    ['approved', 'paid'].includes(c.status)
  ).length;

  // Calculate balance
  const totalFinalVideos = packages.reduce((sum, p) => {
    const hooksPerVideo = p.hooks_per_video || 1;
    return sum + ((p.content_quantity || 0) * hooksPerVideo);
  }, 0);
  const totalContentPromised = packages.reduce((sum, p) => sum + (p.content_quantity || 0), 0);
  const costPerFinalVideo = totalFinalVideos > 0 ? totalValue / totalFinalVideos : 0;
  const avgHooksPerVideo = totalContentPromised > 0 ? totalFinalVideos / totalContentPromised : 1;
  const approvedVideosValue = deliveredCount * avgHooksPerVideo * costPerFinalVideo;
  const clientBalance = totalInvested - approvedVideosValue;

  // Videos pendientes por entregar
  const pendingToDeliver = Math.max(0, totalContentPromised - deliveredCount);

  // Deuda pendiente de pago
  const pendingPayment = Math.max(0, totalValue - totalInvested);

  // Fecha de vencimiento más próxima (solo de paquetes con deuda)
  const nextDueDate = packages
    .filter(p => p.payment_due_date && p.payment_status !== 'paid')
    .map(p => new Date(p.payment_due_date!))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;

  // Generar subtitle para "Por Pagar"
  const getPaymentSubtitle = () => {
    if (pendingPayment === 0) return "al día";
    if (!nextDueDate) return "deuda pendiente";

    if (isPast(nextDueDate) && !isToday(nextDueDate)) {
      return `vencido ${format(nextDueDate, "d MMM", { locale: es })}`;
    }
    if (isToday(nextDueDate)) {
      return "vence hoy";
    }
    const daysLeft = differenceInDays(nextDueDate, new Date());
    if (daysLeft <= 7) {
      return `vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`;
    }
    return `vence ${format(nextDueDate, "d MMM", { locale: es })}`;
  };

  // Determinar variante del KPI según urgencia
  const getPaymentVariant = (): "success" | "warning" | "primary" | "info" => {
    if (pendingPayment === 0) return "success";
    if (!nextDueDate) return "warning";
    if (isPast(nextDueDate) && !isToday(nextDueDate)) return "warning"; // vencido
    if (isToday(nextDueDate)) return "warning";
    const daysLeft = differenceInDays(nextDueDate, new Date());
    if (daysLeft <= 3) return "warning";
    return "info"; // tiene tiempo
  };

  // Get recent videos (all statuses, most recent first) - always 8 max
  const recentVideos = [...content]
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 8);

  // Get activity feed
  const activities = useClientActivityFeed(content, 12);

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

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

      {/* KPI Cards - 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <NovaKpiCard
          title="Pagado"
          value={totalInvested}
          prefix="$"
          icon={DollarSign}
          variant="success"
          subtitle={`de $${totalValue.toLocaleString()} total`}
        />
        <NovaKpiCard
          title="Por Pagar"
          value={pendingPayment}
          prefix="$"
          icon={AlertCircle}
          variant={getPaymentVariant()}
          subtitle={getPaymentSubtitle()}
        />
        <NovaKpiCard
          title="Por Entregar"
          value={pendingToDeliver}
          icon={Clock}
          variant={pendingToDeliver > 0 ? "warning" : "success"}
          subtitle={`de ${totalContentPromised} prometidos`}
        />
        <NovaKpiCard
          title="Entregados"
          value={deliveredCount}
          icon={CheckCircle2}
          variant="info"
          subtitle="videos aprobados"
        />
        <NovaKpiCard
          title={clientBalance >= 0 ? "Saldo a Favor" : "Saldo Pendiente"}
          value={Math.abs(Math.round(clientBalance))}
          prefix={clientBalance >= 0 ? "+$" : "-$"}
          icon={Wallet}
          variant={clientBalance >= 0 ? "success" : "warning"}
          subtitle={clientBalance >= 0 ? "crédito disponible" : "por regularizar"}
        />
      </div>

      {/* Banner Crítico - Descargas Suspendidas por Pago Vencido */}
      {hasExpiredPayment && (
        <div
          className={cn(
            "rounded-lg border-2 border-red-500 p-4",
            "bg-red-50 dark:bg-red-950/30"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
              <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 dark:text-red-200 text-base">
                Descargas suspendidas
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Tienes <strong>${expiredAmount.toLocaleString()}</strong> en pagos vencidos.
                Regulariza tu situación para habilitar las descargas de contenido.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Puedes seguir viendo tu contenido, pero las descargas están bloqueadas hasta que actualices tu pago.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner - Pago pendiente/vencido (solo si no hay pagos vencidos ya mostrados) */}
      {pendingPayment > 0 && !hasExpiredPayment && (
        <NovaAlertBanner
          type={nextDueDate && (isPast(nextDueDate) && !isToday(nextDueDate)) ? "warning" : "review"}
          title={
            nextDueDate && isPast(nextDueDate) && !isToday(nextDueDate)
              ? "Pago vencido"
              : nextDueDate && isToday(nextDueDate)
              ? "Pago vence hoy"
              : "Pago pendiente"
          }
          description={
            nextDueDate
              ? `Tienes $${pendingPayment.toLocaleString()} pendientes de pago${
                  isPast(nextDueDate) && !isToday(nextDueDate)
                    ? ` (venció el ${format(nextDueDate, "d 'de' MMMM", { locale: es })})`
                    : isToday(nextDueDate)
                    ? " que vencen hoy"
                    : ` (vence el ${format(nextDueDate, "d 'de' MMMM", { locale: es })})`
                }`
              : `Tienes $${pendingPayment.toLocaleString()} pendientes de pago`
          }
          actionLabel="Ver detalles"
          onAction={() => {}}
        />
      )}

      {/* Mobile: Horizontal scroll videos, then activity */}
      <div className="md:hidden space-y-4">
        {/* Recent Videos - Horizontal scroll on mobile */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Videos Recientes
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAllContent}
              className="text-xs h-8 gap-1"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {recentVideos.slice(0, 6).map((video) => {
              const thumbUrl = getThumbnailUrl(video);
              return (
                <div
                  key={video.id}
                  onClick={() => onVideoClick(video)}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-lg shrink-0 snap-start",
                    "w-28 border border-zinc-200 dark:border-zinc-800",
                    "bg-white dark:bg-[#14141f]",
                    "transition-colors duration-150 hover:border-purple-500/50"
                  )}
                >
                  <div className="aspect-[9/16] relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                        <Video className="h-5 w-5 text-zinc-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-[10px] font-medium text-zinc-100 line-clamp-2 leading-tight">{video.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed - Full width on mobile */}
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Actividad Reciente
          </h3>
          <div className={cn(
            "rounded-lg border border-zinc-200 dark:border-zinc-800",
            "bg-white dark:bg-[#14141f]",
            "p-2"
          )}>
            <NovaActivityFeed
              activities={activities}
              maxItems={8}
              onActivityClick={(activity) => {
                const video = content.find(c => c.id === activity.contentId);
                if (video) onVideoClick(video);
              }}
            />
          </div>
        </div>
      </div>

      {/* Tablet/Desktop: 2 columns (2/3 videos, 1/3 activity) */}
      <div className="hidden md:flex md:gap-4 items-stretch">
        {/* Recent Videos - 2/3 width */}
        <div className="flex-[2]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Videos Recientes
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAllContent}
              className="text-xs h-8 gap-1"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentVideos.map((video) => {
              const thumbUrl = getThumbnailUrl(video);
              return (
                <div
                  key={video.id}
                  onClick={() => onVideoClick(video)}
                  className={cn(
                    "relative cursor-pointer overflow-hidden rounded-lg",
                    "border border-zinc-200 dark:border-zinc-800",
                    "bg-white dark:bg-[#14141f]",
                    "transition-colors duration-150",
                    "hover:border-purple-500/50"
                  )}
                >
                  <div className="aspect-[9/16] relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                        <Video className="h-6 w-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-[10px] font-medium text-zinc-100 line-clamp-2 leading-tight">{video.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed - 1/3 width, same height as videos */}
        <div className="flex-1 flex flex-col">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Actividad Reciente
          </h3>
          <div className={cn(
            "rounded-lg border border-zinc-200 dark:border-zinc-800",
            "bg-white dark:bg-[#14141f]",
            "p-2 flex-1 overflow-y-auto"
          )}>
            <NovaActivityFeed
              activities={activities}
              maxItems={15}
              onActivityClick={(activity) => {
                const video = content.find(c => c.id === activity.contentId);
                if (video) onVideoClick(video);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
