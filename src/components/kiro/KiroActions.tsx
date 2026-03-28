import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { QuickAction } from './QuickAction';
import { cn } from '@/lib/utils';
import type { KiroState } from './Kiro3D';
import type { KiroZone } from '@/contexts/KiroContext';
import { getZoneConfig, getZoneActions, type ZoneAction } from './config/zoneActions';
import { kiroSounds } from './sounds/KiroSounds';
import type { AwardResult } from './hooks/useKiroGamification';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface KiroActionsProps {
  onStateChange: (state: KiroState) => void;
  onSendMessage: (message: string) => void;
  currentZone?: KiroZone;
  /** Función para otorgar puntos por usar acciones */
  awardPoints?: (sourceKey: string, description?: string) => Promise<AwardResult>;
}

// Acciones genéricas que siempre están disponibles
const GENERIC_ACTIONS: ZoneAction[] = [
  {
    icon: Sparkles,
    label: 'Generar Hook',
    description: 'Primeros 3 segundos',
    prompt: 'Genera 3 hooks creativos para los primeros 3 segundos de un video',
    priority: 1,
  },
];

// Número máximo de acciones visibles antes de "Ver más"
const MAX_VISIBLE_ACTIONS = 4;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export function KiroActions({ onStateChange, onSendMessage, currentZone = 'general', awardPoints }: KiroActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionToast, setActionToast] = useState<{
    show: boolean;
    points: number;
    key: number;
  } | null>(null);

  // Obtener configuración de la zona actual
  const zoneConfig = useMemo(() => getZoneConfig(currentZone), [currentZone]);
  const zoneActions = useMemo(() => getZoneActions(currentZone), [currentZone]);

  // Determinar si hay más acciones que mostrar
  const hasMoreActions = zoneActions.length > MAX_VISIBLE_ACTIONS;
  const visibleActions = isExpanded ? zoneActions : zoneActions.slice(0, MAX_VISIBLE_ACTIONS);

  // Handler para ejecutar una acción
  const handleAction = useCallback(async (prompt: string, actionLabel: string) => {
    kiroSounds.play('action_click');
    onStateChange('working');
    onSendMessage(prompt);

    // Otorgar puntos por usar acción rápida
    if (awardPoints) {
      const result = await awardPoints('kiro_quick_action', actionLabel);
      if (result.awarded) {
        // Mostrar toast con flash verde
        setActionToast({
          show: true,
          points: result.points,
          key: Date.now(),
        });

        // Ocultar después de 2 segundos
        setTimeout(() => {
          setActionToast(null);
        }, 2000);
      }
    }
  }, [onStateChange, onSendMessage, awardPoints]);

  // Reset expansión cuando cambia la zona
  useMemo(() => {
    setIsExpanded(false);
  }, [currentZone]);

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER DE ZONA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="pb-2 border-b border-violet-500/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{zoneConfig.zoneEmoji}</span>
          <div>
            <h3 className="text-sm font-medium text-violet-300">
              {zoneConfig.zoneName}
            </h3>
            <p className="text-[10px] text-gray-500">
              Acciones disponibles en esta zona
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACCIONES DE LA ZONA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="grid grid-cols-2 gap-1.5">
          {visibleActions.map((action) => (
            <QuickAction
              key={action.label}
              icon={action.icon}
              label={action.label}
              description={action.description}
              onClick={() => handleAction(action.prompt, action.label)}
            />
          ))}
        </div>

        {/* Botón Ver más / Ver menos */}
        {hasMoreActions && (
          <button
            onClick={() => {
              kiroSounds.play('action_click');
              setIsExpanded(!isExpanded);
            }}
            className={cn(
              'w-full mt-2 py-2 px-3 rounded-sm min-h-[44px]',
              'flex items-center justify-center gap-1',
              'text-xs text-violet-400',
              'bg-violet-500/5 border border-violet-500/10',
              'hover:bg-violet-500/10 transition-colors'
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ver más ({zoneActions.length - MAX_VISIBLE_ACTIONS})
              </>
            )}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACCIONES GENÉRICAS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="pt-2 border-t border-violet-500/10">
        <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
          Siempre disponibles
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {GENERIC_ACTIONS.map((action) => (
            <QuickAction
              key={action.label}
              icon={action.icon}
              label={action.label}
              description={action.description}
              onClick={() => handleAction(action.prompt, action.label)}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ESTADO DEL SISTEMA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="pt-2 border-t border-violet-500/10">
        <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
          Sistema
        </h3>
        <div className="space-y-1 text-[11px] text-gray-500">
          <div className="flex justify-between">
            <span>Tokens IA</span>
            <span className="text-violet-400">∞</span>
          </div>
          <div className="flex justify-between">
            <span>Zona</span>
            <span className="text-violet-300">
              {zoneConfig.zoneEmoji} {zoneConfig.zoneName}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTION TOAST (green flash) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {actionToast?.show && (
        <div
          key={actionToast.key}
          className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-1 px-3 py-1.5 rounded-full',
            'bg-green-500/90 text-white text-sm font-medium',
            'shadow-lg shadow-green-500/30'
          )}
          style={{
            animation: 'kiro-action-flash 2s ease-out forwards',
          }}
        >
          <span>+{actionToast.points} UP</span>
          <span>✨</span>
        </div>
      )}

      {/* Estilos para la animación del toast */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes kiro-action-flash {
            0% {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
              box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
            }
            20% {
              transform: translate(-50%, -5px) scale(1.1);
              box-shadow: 0 0 30px rgba(34, 197, 94, 0.8);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -15px) scale(1.05);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -30px) scale(0.9);
              box-shadow: 0 0 0 transparent;
            }
          }
        `
      }} />
    </div>
  );
}
