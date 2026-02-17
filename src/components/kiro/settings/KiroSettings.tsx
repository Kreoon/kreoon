import { useState, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Bell, BellOff, Eye, EyeOff, RotateCcw, Trash2, Gamepad2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { kiroSounds } from '../sounds/KiroSounds';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type KiroCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface KiroSettings {
  /** Sonidos habilitados */
  soundEnabled: boolean;
  /** Volumen de sonidos (0 a 1) */
  soundVolume: number;
  /** Voz de KIRO habilitada */
  voiceEnabled: boolean;
  /** Volumen de la voz (0 a 1) */
  voiceVolume: number;
  /** Mostrar toasts flotantes */
  showToasts: boolean;
  /** Solo mostrar toasts urgentes */
  onlyUrgentToasts: boolean;
  /** KIRO visible al iniciar */
  visibleOnStart: boolean;
  /** Esquina preferida para el botón flotante (mobile) */
  preferredCorner: KiroCorner;
}

export const DEFAULT_KIRO_SETTINGS: KiroSettings = {
  soundEnabled: true,
  soundVolume: 0.7,
  voiceEnabled: true,
  voiceVolume: 0.8,
  showToasts: true,
  onlyUrgentToasts: false,
  visibleOnStart: true,
  preferredCorner: 'bottom-right',
};

interface KiroSettingsProps {
  /** Configuración actual */
  settings: KiroSettings;
  /** Callback al actualizar settings */
  onUpdate: (settings: Partial<KiroSettings>) => void;
  /** Callback para volver al tab anterior */
  onBack: () => void;
  /** Mejor puntaje del juego */
  gameBestScore?: number;
  /** Partidas jugadas hoy */
  gamesPlayedToday?: number;
  /** Callback para resetear mejor puntaje */
  onResetBestScore?: () => void;
  /** Callback para limpiar historial de chat */
  onClearChatHistory?: () => void;
  /** Callback para resetear todas las preferencias */
  onResetPreferences?: () => void;
  /** Callback para probar la voz de KIRO */
  onTestVoice?: () => void;
  /** Si la voz está hablando actualmente */
  isVoiceSpeaking?: boolean;
  /** Si el navegador soporta voz */
  isVoiceSupported?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Toggle estilo iOS
 */
function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => {
        kiroSounds.play('action_click');
        onChange(!enabled);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a12]',
        enabled ? 'bg-violet-500' : 'bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-lg',
          'transform transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

/**
 * Slider de volumen
 */
function VolumeSlider({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <VolumeX className="w-4 h-4 text-gray-500" />
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        disabled={disabled}
        className={cn(
          'flex-1 h-2 rounded-full appearance-none cursor-pointer',
          'bg-gray-700',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500',
          '[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500',
          '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${value * 100}%, #374151 ${value * 100}%, #374151 100%)`,
        }}
      />
      <Volume2 className="w-4 h-4 text-violet-400" />
      <span className="text-xs text-gray-400 w-8 text-right">{Math.round(value * 100)}%</span>
    </div>
  );
}

/**
 * Selector de esquina
 */
function CornerSelector({
  value,
  onChange,
}: {
  value: KiroCorner;
  onChange: (corner: KiroCorner) => void;
}) {
  const corners: KiroCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return (
    <div className="grid grid-cols-2 gap-1 w-20 h-20">
      {corners.map((corner) => (
        <button
          key={corner}
          onClick={() => {
            kiroSounds.play('action_click');
            onChange(corner);
          }}
          className={cn(
            'rounded transition-colors',
            value === corner
              ? 'bg-violet-500'
              : 'bg-gray-700 hover:bg-gray-600'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Título de sección
 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">
      {children}
    </h3>
  );
}

/**
 * Fila de setting
 */
function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <div>
          <p className="text-sm text-gray-300">{label}</p>
          {description && <p className="text-[10px] text-gray-600">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroSettingsPanel({
  settings,
  onUpdate,
  onBack,
  gameBestScore = 0,
  gamesPlayedToday = 0,
  onResetBestScore,
  onClearChatHistory,
  onResetPreferences,
  onTestVoice,
  isVoiceSpeaking = false,
  isVoiceSupported = true,
}: KiroSettingsProps) {
  const [confirmAction, setConfirmAction] = useState<'bestScore' | 'chatHistory' | 'preferences' | null>(null);

  // Handler para actualizar y propagar sonidos
  const handleSoundEnabledChange = useCallback(
    (enabled: boolean) => {
      onUpdate({ soundEnabled: enabled });
      kiroSounds.setEnabled(enabled);
    },
    [onUpdate]
  );

  const handleSoundVolumeChange = useCallback(
    (volume: number) => {
      onUpdate({ soundVolume: volume });
      kiroSounds.setVolume(volume);
    },
    [onUpdate]
  );

  // Handler para probar sonido
  const handleTestSound = useCallback(() => {
    kiroSounds.play('notification');
  }, []);

  // Handlers de voz
  const handleVoiceEnabledChange = useCallback(
    (enabled: boolean) => {
      onUpdate({ voiceEnabled: enabled });
    },
    [onUpdate]
  );

  const handleVoiceVolumeChange = useCallback(
    (volume: number) => {
      onUpdate({ voiceVolume: volume });
    },
    [onUpdate]
  );

  // Handlers de confirmación
  const handleConfirmAction = useCallback(() => {
    switch (confirmAction) {
      case 'bestScore':
        onResetBestScore?.();
        break;
      case 'chatHistory':
        onClearChatHistory?.();
        break;
      case 'preferences':
        onResetPreferences?.();
        break;
    }
    setConfirmAction(null);
  }, [confirmAction, onResetBestScore, onClearChatHistory, onResetPreferences]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-500/10">
        <button
          onClick={() => {
            kiroSounds.play('action_click');
            onBack();
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-medium text-violet-300">Configuración de KIRO</h2>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SONIDOS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Sonidos</SectionTitle>

          <SettingRow icon={Volume2} label="Sonidos de KIRO">
            <Toggle
              enabled={settings.soundEnabled}
              onChange={handleSoundEnabledChange}
            />
          </SettingRow>

          <div className="mt-2">
            <VolumeSlider
              value={settings.soundVolume}
              onChange={handleSoundVolumeChange}
              disabled={!settings.soundEnabled}
            />
          </div>

          <button
            onClick={handleTestSound}
            disabled={!settings.soundEnabled}
            className={cn(
              'mt-2 w-full py-1.5 px-3 rounded-lg text-xs',
              'border border-violet-500/30',
              settings.soundEnabled
                ? 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20'
                : 'text-gray-600 bg-gray-800/50 cursor-not-allowed',
              'transition-colors'
            )}
          >
            🔔 Probar sonido
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VOZ DE KIRO */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-violet-500/10 pt-4">
          <SectionTitle>Voz de KIRO</SectionTitle>

          {!isVoiceSupported ? (
            <p className="text-xs text-gray-500 italic">
              Voz no disponible en este navegador
            </p>
          ) : (
            <>
              <SettingRow icon={Mic} label="Voz activa" description="KIRO habla sus respuestas">
                <Toggle
                  enabled={settings.voiceEnabled}
                  onChange={handleVoiceEnabledChange}
                />
              </SettingRow>

              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <MicOff className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.voiceVolume * 100}
                    onChange={(e) => handleVoiceVolumeChange(Number(e.target.value) / 100)}
                    disabled={!settings.voiceEnabled}
                    className={cn(
                      'flex-1 h-2 rounded-full appearance-none cursor-pointer',
                      'bg-gray-700',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500',
                      '[&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
                      '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500',
                      '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer',
                      !settings.voiceEnabled && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${settings.voiceVolume * 100}%, #374151 ${settings.voiceVolume * 100}%, #374151 100%)`,
                    }}
                  />
                  <Mic className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-gray-400 w-8 text-right">{Math.round(settings.voiceVolume * 100)}%</span>
                </div>
              </div>

              <button
                onClick={onTestVoice}
                disabled={!settings.voiceEnabled || isVoiceSpeaking}
                className={cn(
                  'mt-2 w-full py-1.5 px-3 rounded-lg text-xs',
                  'border border-violet-500/30',
                  settings.voiceEnabled && !isVoiceSpeaking
                    ? 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20'
                    : 'text-gray-600 bg-gray-800/50 cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {isVoiceSpeaking ? '🔊 Hablando...' : '🎙️ Probar voz'}
              </button>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* NOTIFICACIONES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-violet-500/10 pt-4">
          <SectionTitle>Notificaciones</SectionTitle>

          <SettingRow icon={Bell} label="Mostrar toasts flotantes">
            <Toggle
              enabled={settings.showToasts}
              onChange={(v) => onUpdate({ showToasts: v })}
            />
          </SettingRow>

          <SettingRow
            icon={BellOff}
            label="Solo urgentes"
            description="Mostrar solo notificaciones urgentes"
          >
            <Toggle
              enabled={settings.onlyUrgentToasts}
              onChange={(v) => onUpdate({ onlyUrgentToasts: v })}
              disabled={!settings.showToasts}
            />
          </SettingRow>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* APARIENCIA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-violet-500/10 pt-4">
          <SectionTitle>Apariencia</SectionTitle>

          <SettingRow icon={Eye} label="Visible al iniciar">
            <Toggle
              enabled={settings.visibleOnStart}
              onChange={(v) => onUpdate({ visibleOnStart: v })}
            />
          </SettingRow>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-gray-300">Esquina preferida</p>
              <p className="text-[10px] text-gray-600">Posición del botón en mobile</p>
            </div>
            <CornerSelector
              value={settings.preferredCorner}
              onChange={(v) => onUpdate({ preferredCorner: v })}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* JUEGO */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-violet-500/10 pt-4">
          <SectionTitle>Juego</SectionTitle>

          <SettingRow icon={Gamepad2} label={`Mejor puntaje: ${gameBestScore}`}>
            <button
              onClick={() => setConfirmAction('bestScore')}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </SettingRow>

          <div className="text-xs text-gray-500 mt-1">
            Partidas jugadas hoy: {gamesPlayedToday}/6
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DATOS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-violet-500/10 pt-4">
          <SectionTitle>Datos</SectionTitle>

          <button
            onClick={() => setConfirmAction('chatHistory')}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
              'text-xs text-red-400',
              'bg-red-500/10 border border-red-500/20',
              'hover:bg-red-500/20 transition-colors'
            )}
          >
            <Trash2 className="w-3 h-3" />
            Limpiar historial de chat
          </button>

          <button
            onClick={() => setConfirmAction('preferences')}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg mt-2',
              'text-xs text-orange-400',
              'bg-orange-500/10 border border-orange-500/20',
              'hover:bg-orange-500/20 transition-colors'
            )}
          >
            <RotateCcw className="w-3 h-3" />
            Resetear preferencias
          </button>
        </div>

        {/* Link a configuración completa */}
        <div className="border-t border-violet-500/10 pt-4">
          <a
            href="/settings?section=notifications"
            onClick={(e) => {
              e.preventDefault();
              kiroSounds.play('action_click');
              window.location.href = '/settings?section=notifications';
            }}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
              'text-xs text-violet-300',
              'bg-violet-500/10 border border-violet-500/20',
              'hover:bg-violet-500/20 transition-colors'
            )}
          >
            <Bell className="w-3 h-3" />
            Ver todas las preferencias de notificación
          </a>
        </div>

        {/* Footer */}
        <div className="border-t border-violet-500/10 pt-4 pb-2 text-center">
          <p className="text-[10px] text-gray-600">
            KIRO v1.0 • Kreoon Studio
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DE CONFIRMACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {confirmAction && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 animate-in fade-in duration-150">
          <div className="bg-[#0a0a12] border border-violet-500/30 rounded-xl p-4 mx-4 max-w-[280px]">
            <h3 className="text-sm font-medium text-violet-300 mb-2">
              ¿Confirmar acción?
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {confirmAction === 'bestScore' && 'Se reseteará tu mejor puntaje del juego.'}
              {confirmAction === 'chatHistory' && 'Se eliminará todo el historial de conversación con KIRO.'}
              {confirmAction === 'preferences' && 'Se restaurarán todas las preferencias a sus valores por defecto.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
