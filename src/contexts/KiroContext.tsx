import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useKiroPersistence,
  type KiroChatMessage,
  type KiroPreferences,
} from '@/components/kiro/hooks/useKiroPersistence';
import { useKiroNotifications } from '@/components/kiro/hooks/useKiroNotifications';
import type {
  KiroNotification,
  NewKiroNotification,
} from '@/components/kiro/types/notifications';
import {
  useKiroGamification,
  type AwardResult,
} from '@/components/kiro/hooks/useKiroGamification';
import type { KiroLevel } from '@/components/kiro/config/gamification';
import { useIsMobile } from '@/components/kiro/hooks/useKiroResponsive';
import { kiroSounds } from '@/components/kiro/sounds/KiroSounds';
import {
  type KiroSettings as KiroSettingsType,
  type KiroCorner,
  DEFAULT_KIRO_SETTINGS,
} from '@/components/kiro/settings/KiroSettings';
// Phase 9: Agentic imports
import { useKiroPlatformSync, type KiroPlatformSyncState } from '@/components/kiro/bridge';
import {
  detectIntent,
  type IntentDetectionResult,
  type SuggestedAction,
} from '@/components/kiro/agentic/KiroIntentDetector';
import {
  executeAction,
  type ActionExecutionResult,
  type ActionExecutionContext,
} from '@/components/kiro/agentic/KiroActionExecutor';
import {
  KiroProactiveEngine,
  type ProactiveSuggestion,
  createUserContext,
  createEmptyMetrics,
  suggestionToNotification,
} from '@/components/kiro/agentic/KiroProactiveEngine';
import { useAuth } from '@/hooks/useAuth';
import { useKiroVoice, type UseKiroVoiceReturn } from '@/components/kiro/hooks/useKiroVoice';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/** Estados de KIRO que afectan su apariencia y comportamiento */
export type KiroState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'working'
  | 'celebrating'
  | 'playing'
  | 'sleeping';

/** Expresiones faciales de KIRO */
export type KiroExpression =
  | 'neutral'
  | 'happy'
  | 'surprised'
  | 'talking'
  | 'thinking'
  | 'sleepy';

/** Tipos de reacción que KIRO puede realizar */
export type KiroReactionType = 'bounce' | 'shake' | 'nod' | 'wiggle' | 'jump';

/** Tipos de confetti disponibles */
export type KiroConfettiType = 'celebration' | 'mini' | 'sparkle';

/** Zonas de la plataforma Kreoon */
export type KiroZone =
  | 'sala-de-control'
  | 'camerino'
  | 'set-de-grabacion'
  | 'sala-de-edicion'
  | 'casting'
  | 'sala-de-prensa'
  | 'escuela'
  | 'live-stage'
  | 'general';

/** Interfaz del contexto de KIRO */
export interface KiroContextType {
  // Estado
  kiroState: KiroState;
  expression: KiroExpression;
  isVisible: boolean;
  isOpen: boolean;
  isMinimized: boolean;
  currentZone: KiroZone;
  notifications: KiroNotification[];
  unreadCount: number;
  isMobile: boolean;

  // Funciones de control de estado
  setKiroState: (state: KiroState) => void;
  setExpression: (expression: KiroExpression) => void;
  toggleVisibility: () => void;
  togglePanel: () => void;
  setIsOpen: (open: boolean) => void;
  toggleMinimize: () => void;

  // Funciones de mensajes
  showMessage: (message: string) => void;
  pendingMessages: string[];
  clearPendingMessages: () => void;

  // Sistema de notificaciones (Fase 4)
  addNotification: (notification: NewKiroNotification) => KiroNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Historial de chat persistido
  chatHistory: KiroChatMessage[];
  addChatMessage: (message: Omit<KiroChatMessage, 'id' | 'timestamp'>) => void;
  clearChatHistory: () => void;

  // Preferencias de UI
  preferences: KiroPreferences;
  updatePreferences: (prefs: Partial<KiroPreferences>) => void;

  // Settings de KIRO (Fase 7)
  kiroSettings: KiroSettingsType;
  updateKiroSettings: (settings: Partial<KiroSettingsType>) => void;

  // Animaciones y reacciones (Fase 8)
  triggerReaction: (type: KiroReactionType) => void;
  triggerConfetti: (type: KiroConfettiType) => void;
  triggerAntennaVibration: () => void;
  registerAnimationHandlers: (handlers: {
    onReaction?: (type: KiroReactionType) => void;
    onConfetti?: (type: KiroConfettiType) => void;
    onAntennaVibration?: () => void;
  }) => () => void;

  // Gamificación (Fase 6)
  gamification: {
    userPoints: number;
    currentLevel: KiroLevel;
    nextLevel: KiroLevel | null;
    progress: number;
    pointsToNext: number;
    gameBestScore: number;
    isLoading: boolean;
    awardPoints: (sourceKey: string, description?: string) => Promise<AwardResult>;
    getGameBonusesRemaining: () => number;
    updateGameBestScore: (score: number) => void;
  };

  // Voz de KIRO (Fase 10)
  voice: UseKiroVoiceReturn;

  // Sistema Agéntico (Fase 9)
  agentic: {
    /** Estado de sincronización con la plataforma */
    platformSyncState: KiroPlatformSyncState;
    /** Detectar intención de un texto */
    detectIntent: (text: string) => IntentDetectionResult;
    /** Ejecutar una acción sugerida */
    executeAction: (action: SuggestedAction) => Promise<ActionExecutionResult>;
    /** Sugerencias proactivas activas */
    proactiveSuggestions: ProactiveSuggestion[];
    /** Descartar una sugerencia proactiva */
    dismissProactiveSuggestion: (id: string) => void;
    /** Forzar sincronización con plataforma */
    forceSync: () => Promise<void>;
    /** Conteo de notificaciones de plataforma no leídas */
    platformUnreadCount: number;
  };
}

// Re-export types
export type { KiroChatMessage, KiroPreferences };
export type { KiroNotification, NewKiroNotification };
export type { AwardResult, KiroLevel };
export type { KiroSettingsType as KiroSettings, KiroCorner };
export type { KiroReactionType, KiroConfettiType };
// Phase 9 types
export type { IntentDetectionResult, SuggestedAction };
export type { ActionExecutionResult };
export type { ProactiveSuggestion, KiroPlatformSyncState };

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ZONAS
// ═══════════════════════════════════════════════════════════════════════════

/** Mapeo de rutas a zonas de la plataforma */
const ROUTE_TO_ZONE: Record<string, KiroZone> = {
  // Sala de Control - Dashboard y métricas
  '/dashboard': 'sala-de-control',
  '/admin': 'sala-de-control',

  // Camerino - Perfil y portfolio del creador
  '/creator-dashboard': 'camerino',
  '/profile': 'camerino',
  '/marketplace': 'camerino',
  '/wallet': 'camerino',

  // Set de Grabación - Scripts y contenido
  '/scripts': 'set-de-grabacion',
  '/content': 'set-de-grabacion',

  // Investigación de mercado
  '/research': 'sala-de-control',

  // Sala de Edición - Board y producciones
  '/board': 'sala-de-edicion',
  '/editor-dashboard': 'sala-de-edicion',
  '/productions': 'sala-de-edicion',

  // Casting - Creadores y talento
  '/creators': 'casting',
  '/casting': 'casting',
  '/clients': 'casting',
  '/team': 'casting',

  // Sala de Prensa - Analytics y reportes
  '/analytics': 'sala-de-prensa',
  '/reports': 'sala-de-prensa',
  '/marketing': 'sala-de-prensa',

  // Escuela - Formación y academia
  '/training': 'escuela',
  '/academy': 'escuela',
  '/ranking': 'escuela',

  // Live Stage - Streaming en vivo
  '/live': 'live-stage',
  '/streaming': 'live-stage',
};

/** Información descriptiva de cada zona */
export const ZONE_INFO: Record<KiroZone, { label: string; description: string; icon: string }> = {
  'sala-de-control': {
    label: 'Sala de Control',
    description: 'Dashboard y métricas del sistema',
    icon: '📊',
  },
  'camerino': {
    label: 'Camerino',
    description: 'Tu perfil, portafolio y configuración personal',
    icon: '🪞',
  },
  'set-de-grabacion': {
    label: 'Set de Grabación',
    description: 'Creación de guiones y contenido',
    icon: '🎬',
  },
  'sala-de-edicion': {
    label: 'Sala de Edición',
    description: 'Gestión de producciones y board',
    icon: '🎞️',
  },
  'casting': {
    label: 'Casting',
    description: 'Búsqueda y gestión de talento',
    icon: '🎭',
  },
  'sala-de-prensa': {
    label: 'Sala de Prensa',
    description: 'Analytics, reportes y marketing',
    icon: '📰',
  },
  'escuela': {
    label: 'Escuela',
    description: 'Formación y ranking',
    icon: '🎓',
  },
  'live-stage': {
    label: 'Live Stage',
    description: 'Streaming y eventos en vivo',
    icon: '🔴',
  },
  'general': {
    label: 'General',
    description: 'Navegación general',
    icon: '🏠',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════

const KiroContext = createContext<KiroContextType | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface KiroProviderProps {
  children: ReactNode;
}

// Storage key para settings de KIRO
const KIRO_SETTINGS_STORAGE_KEY = 'kreoon_kiro_settings';

export function KiroProvider({ children }: KiroProviderProps) {
  // Hook de persistencia
  const persistence = useKiroPersistence();

  // Hook de detección de mobile
  const isMobile = useIsMobile();

  // Estado principal de KIRO
  const [kiroState, setKiroStateInternal] = useState<KiroState>('idle');
  const [expression, setExpressionInternal] = useState<KiroExpression>('neutral');
  const [isVisible, setIsVisible] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);

  // Estado de historial de chat (cargado desde localStorage)
  const [chatHistory, setChatHistory] = useState<KiroChatMessage[]>([]);
  const [preferences, setPreferences] = useState<KiroPreferences>(persistence.DEFAULT_PREFERENCES);

  // Settings de KIRO (Fase 7)
  const [kiroSettings, setKiroSettings] = useState<KiroSettingsType>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(KIRO_SETTINGS_STORAGE_KEY);
        if (saved) {
          return { ...DEFAULT_KIRO_SETTINGS, ...JSON.parse(saved) };
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    return DEFAULT_KIRO_SETTINGS;
  });

  // Flag para evitar doble carga inicial
  const isInitialized = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Sistema de Animaciones y Reacciones (Fase 8)
  // ─────────────────────────────────────────────────────────────────────────

  // Handlers registrados para animaciones
  const animationHandlersRef = useRef<{
    onReaction?: (type: KiroReactionType) => void;
    onConfetti?: (type: KiroConfettiType) => void;
    onAntennaVibration?: () => void;
  }>({});

  // Registrar handlers de animación (llamado por KiroWidget)
  const registerAnimationHandlers = useCallback(
    (handlers: {
      onReaction?: (type: KiroReactionType) => void;
      onConfetti?: (type: KiroConfettiType) => void;
      onAntennaVibration?: () => void;
    }) => {
      animationHandlersRef.current = { ...animationHandlersRef.current, ...handlers };

      // Retornar función de limpieza
      return () => {
        if (handlers.onReaction) animationHandlersRef.current.onReaction = undefined;
        if (handlers.onConfetti) animationHandlersRef.current.onConfetti = undefined;
        if (handlers.onAntennaVibration) animationHandlersRef.current.onAntennaVibration = undefined;
      };
    },
    []
  );

  // Disparar reacción en KIRO
  const triggerReaction = useCallback((type: KiroReactionType) => {
    animationHandlersRef.current.onReaction?.(type);
  }, []);

  // Disparar confetti
  const triggerConfetti = useCallback((type: KiroConfettiType) => {
    animationHandlersRef.current.onConfetti?.(type);
  }, []);

  // Vibrar antenas de KIRO
  const triggerAntennaVibration = useCallback(() => {
    animationHandlersRef.current.onAntennaVibration?.();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Sistema de Notificaciones (Fase 4)
  // ─────────────────────────────────────────────────────────────────────────
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll: clearAllNotifications,
  } = useKiroNotifications({
    onKiroStateChange: (state) => setKiroStateInternal(state),
    onKiroExpressionChange: (expr) => setExpressionInternal(expr),
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Sistema de Gamificación (Fase 6)
  // ─────────────────────────────────────────────────────────────────────────
  const gamification = useKiroGamification();

  // Detectar zona actual basada en la ruta
  const location = useLocation();
  const navigate = useNavigate();

  // Auth para contexto de usuario
  const { user, profile } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // Sistema Agéntico (Fase 9)
  // ─────────────────────────────────────────────────────────────────────────

  // Estado de sugerencias proactivas
  const [proactiveSuggestions, setProactiveSuggestions] = useState<ProactiveSuggestion[]>([]);

  // Timestamp de inicio de sesión para contexto de usuario
  const sessionStartRef = useRef<number>(Date.now());

  // Motor proactivo
  const proactiveEngineRef = useRef<KiroProactiveEngine | null>(null);

  // Tab activa del widget (para comandos)
  const [activeTab, setActiveTab] = useState<'chat' | 'notifications' | 'actions' | 'game'>('chat');

  // Detectar zona actual basada en la ruta (movido aquí para que esté disponible antes del useEffect del motor proactivo)
  const currentZone = useMemo<KiroZone>(() => {
    const pathname = location.pathname;

    // Buscar coincidencia exacta primero
    if (ROUTE_TO_ZONE[pathname]) {
      return ROUTE_TO_ZONE[pathname];
    }

    // Buscar coincidencia por prefijo (para rutas anidadas como /wallet/transactions)
    const matchingRoute = Object.keys(ROUTE_TO_ZONE).find((route) =>
      pathname.startsWith(route)
    );

    return matchingRoute ? ROUTE_TO_ZONE[matchingRoute] : 'general';
  }, [location.pathname]);

  // Refs para evitar recrear el engine en cada cambio de zona/callback
  const currentZoneRef = useRef(currentZone);
  currentZoneRef.current = currentZone;
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;

  // Voz de KIRO (Fase 10) — instanciado a nivel de contexto para uso global
  const kiroVoice = useKiroVoice(
    kiroSettings.voiceEnabled,
    kiroSettings.voiceVolume,
    () => setKiroStateInternal('speaking'),
    () => { if (kiroState === 'speaking') setKiroStateInternal('idle'); },
  );

  // Platform sync hook
  const platformSync = useKiroPlatformSync({
    enabled: true,
    onNewNotification: (notification) => {
      // Agregar a las notificaciones de KIRO
      addNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        zone: notification.zone,
        priority: notification.priority,
        actionLabel: notification.actionLabel,
        actionRoute: notification.actionRoute,
        metadata: notification.metadata,
      });
    },
    onTriggerReaction: (reaction) => {
      triggerReaction(reaction);
    },
    onVibrateAntenna: () => {
      triggerAntennaVibration();
    },
    onTriggerConfetti: (type) => {
      triggerConfetti(type);
    },
    onVoiceAnnouncement: (text, emotion) => {
      if (kiroSettings.soundEnabled && kiroSettings.voiceEnabled) {
        kiroVoice.speak(text, emotion);
      }
    },
  });

  // Ejecutor de acciones - contexto de ejecución
  const createActionContext = useCallback((): ActionExecutionContext => ({
    navigate,
    setKiroState: setKiroStateInternal,
    setKiroExpression: setExpressionInternal,
    setActiveTab,
    addKiroMessage: (message: string) => {
      setPendingMessages((prev) => [...prev, message]);
    },
    triggerReaction: (type: string) => {
      triggerReaction(type as KiroReactionType);
    },
    userId: user?.id,
    organizationId: profile?.current_organization_id,
  }), [navigate, user?.id, profile?.current_organization_id, triggerReaction]);

  // Función para ejecutar acción
  const executeActionFn = useCallback(async (action: SuggestedAction): Promise<ActionExecutionResult> => {
    const context = createActionContext();
    return executeAction(action, context);
  }, [createActionContext]);

  // Descartar sugerencia proactiva
  const dismissProactiveSuggestion = useCallback((id: string) => {
    setProactiveSuggestions((prev) => prev.filter((s) => s.id !== id));
    proactiveEngineRef.current?.dismissSuggestion(id);
  }, []);

  // Inicializar motor proactivo
  useEffect(() => {
    if (!user?.id || !profile?.current_organization_id) return;

    const engine = new KiroProactiveEngine({
      enabled: true,
      evaluationIntervalMs: 5 * 60 * 1000, // 5 minutos
      maxSuggestions: 3,
      onSuggestion: (suggestion) => {
        setProactiveSuggestions((prev) => [...prev, suggestion]);

        // Si debe mostrarse como notificación, agregarla
        if (suggestion.showAsNotification) {
          const notificationData = suggestionToNotification(suggestion);
          addNotificationRef.current(notificationData);
        }
      },
      getUserContext: () =>
        createUserContext(
          user.id,
          profile.current_organization_id!,
          currentZoneRef.current,
          profile.roles || [],
          sessionStartRef.current
        ),
      getMetrics: () => {
        // Por ahora retornamos métricas vacías
        // En el futuro se pueden conectar con hooks reales
        return createEmptyMetrics();
      },
    });

    proactiveEngineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [user?.id, profile?.current_organization_id]);

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE CONTROL (memoizadas para evitar re-renders)
  // ─────────────────────────────────────────────────────────────────────────

  const setKiroState = useCallback((state: KiroState) => {
    setKiroStateInternal(state);

    // Auto-ajustar expresión según el estado
    const stateToExpression: Record<KiroState, KiroExpression> = {
      idle: 'neutral',
      listening: 'surprised',
      thinking: 'thinking',
      speaking: 'talking',
      working: 'thinking',
      celebrating: 'happy',
      playing: 'happy',
      sleeping: 'sleepy',
    };
    setExpressionInternal(stateToExpression[state]);
  }, []);

  const setExpression = useCallback((expr: KiroExpression) => {
    setExpressionInternal(expr);
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
    // Si se abre, quitar el estado minimizado
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
    // Si se minimiza, cerrar el panel
    if (!isMinimized) {
      setIsOpen(false);
    }
  }, [isMinimized]);

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE MENSAJES
  // ─────────────────────────────────────────────────────────────────────────

  const showMessage = useCallback((message: string) => {
    // Agregar mensaje a la cola de mensajes pendientes
    // KiroChat los consumirá y mostrará
    setPendingMessages((prev) => [...prev, message]);

    // Abrir el panel y cambiar estado a speaking
    setIsOpen(true);
    setKiroStateInternal('speaking');

    // Volver a idle después de un tiempo
    setTimeout(() => {
      setKiroStateInternal('idle');
    }, 3000);
  }, []);

  const clearPendingMessages = useCallback(() => {
    setPendingMessages([]);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // EFECTO: Log de cambio de zona (útil para debugging)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[KIRO] Zona actual: ${ZONE_INFO[currentZone].label}`);
    }
  }, [currentZone]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFECTO: Cargar datos persistidos al inicializar
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Cargar historial de chat
    const savedMessages = persistence.loadMessages();
    if (savedMessages.length > 0) {
      setChatHistory(savedMessages);
    }

    // Cargar preferencias
    const savedPreferences = persistence.loadPreferences();
    setPreferences(savedPreferences);
    setIsVisible(savedPreferences.isVisible);
  }, [persistence]);

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE HISTORIAL DE CHAT
  // ─────────────────────────────────────────────────────────────────────────

  const addChatMessage = useCallback(
    (message: Omit<KiroChatMessage, 'id' | 'timestamp'>) => {
      const newMessage: KiroChatMessage = {
        ...message,
        id: `kiro-msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };

      setChatHistory((prev) => {
        const updated = [...prev, newMessage];
        // Persistir inmediatamente
        persistence.saveMessages(updated);
        return updated;
      });
    },
    [persistence]
  );

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    persistence.clearMessages();
  }, [persistence]);

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE PREFERENCIAS
  // ─────────────────────────────────────────────────────────────────────────

  const updatePreferences = useCallback(
    (prefs: Partial<KiroPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...prefs };
        persistence.savePreferences(updated);

        // Aplicar cambios de visibilidad inmediatamente
        if (prefs.isVisible !== undefined) {
          setIsVisible(prefs.isVisible);
        }

        return updated;
      });
    },
    [persistence]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCIONES DE SETTINGS DE KIRO (Fase 7)
  // ─────────────────────────────────────────────────────────────────────────

  const updateKiroSettings = useCallback((newSettings: Partial<KiroSettingsType>) => {
    setKiroSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // Persistir en localStorage
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(KIRO_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignorar errores de storage
        }
      }

      // Propagar cambios de sonido al engine
      if (newSettings.soundEnabled !== undefined) {
        kiroSounds.setEnabled(newSettings.soundEnabled);
      }
      if (newSettings.soundVolume !== undefined) {
        kiroSounds.setVolume(newSettings.soundVolume);
      }

      return updated;
    });
  }, []);

  // Sincronizar settings de sonido al montar
  useEffect(() => {
    kiroSounds.setEnabled(kiroSettings.soundEnabled);
    kiroSounds.setVolume(kiroSettings.soundVolume);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // VALOR DEL CONTEXTO (memoizado)
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue = useMemo<KiroContextType>(
    () => ({
      // Estado
      kiroState,
      expression,
      isVisible,
      isOpen,
      isMinimized,
      currentZone,
      notifications,
      unreadCount,
      isMobile,

      // Funciones de control
      setKiroState,
      setExpression,
      toggleVisibility,
      togglePanel,
      setIsOpen,
      toggleMinimize,

      // Mensajes
      showMessage,
      pendingMessages,
      clearPendingMessages,

      // Sistema de notificaciones
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      clearAllNotifications,

      // Historial de chat
      chatHistory,
      addChatMessage,
      clearChatHistory,

      // Preferencias
      preferences,
      updatePreferences,

      // Settings de KIRO (Fase 7)
      kiroSettings,
      updateKiroSettings,

      // Animaciones y reacciones (Fase 8)
      triggerReaction,
      triggerConfetti,
      triggerAntennaVibration,
      registerAnimationHandlers,

      // Gamificación
      gamification: {
        userPoints: gamification.userPoints,
        currentLevel: gamification.currentLevel,
        nextLevel: gamification.nextLevel,
        progress: gamification.progress,
        pointsToNext: gamification.pointsToNext,
        gameBestScore: gamification.gameBestScore,
        isLoading: gamification.isLoading,
        awardPoints: gamification.awardPoints,
        getGameBonusesRemaining: gamification.getGameBonusesRemaining,
        updateGameBestScore: gamification.updateGameBestScore,
      },

      // Voz de KIRO (Fase 10)
      voice: kiroVoice,

      // Sistema Agéntico (Fase 9)
      agentic: {
        platformSyncState: platformSync.state,
        detectIntent,
        executeAction: executeActionFn,
        proactiveSuggestions,
        dismissProactiveSuggestion,
        forceSync: platformSync.forceSync,
        platformUnreadCount: platformSync.unreadCount,
      },
    }),
    [
      kiroState,
      expression,
      isVisible,
      isOpen,
      isMinimized,
      currentZone,
      notifications,
      unreadCount,
      isMobile,
      setKiroState,
      setExpression,
      toggleVisibility,
      togglePanel,
      toggleMinimize,
      showMessage,
      pendingMessages,
      clearPendingMessages,
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      clearAllNotifications,
      chatHistory,
      addChatMessage,
      clearChatHistory,
      preferences,
      updatePreferences,
      kiroSettings,
      updateKiroSettings,
      triggerReaction,
      triggerConfetti,
      triggerAntennaVibration,
      registerAnimationHandlers,
      gamification,
      // Phase 10: Voice
      kiroVoice,
      // Phase 9 dependencies
      platformSync.state,
      platformSync.forceSync,
      platformSync.unreadCount,
      executeActionFn,
      proactiveSuggestions,
      dismissProactiveSuggestion,
    ]
  );

  return (
    <KiroContext.Provider value={contextValue}>
      {children}
    </KiroContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PERSONALIZADO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para acceder al contexto de KIRO desde cualquier componente.
 * Debe usarse dentro de un KiroProvider.
 *
 * @example
 * ```tsx
 * const { setKiroState, showMessage, currentZone } = useKiro();
 *
 * // Cambiar estado de KIRO
 * setKiroState('celebrating');
 *
 * // Mostrar un mensaje de KIRO
 * showMessage('¡Tarea completada con éxito!');
 *
 * // Obtener la zona actual
 * console.log(currentZone); // 'sala-de-edicion'
 * ```
 */
export function useKiro(): KiroContextType {
  const context = useContext(KiroContext);

  if (!context) {
    throw new Error(
      'useKiro debe usarse dentro de un KiroProvider. ' +
        'Asegúrate de envolver tu componente con <KiroProvider>.'
    );
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS ADICIONALES
// ═══════════════════════════════════════════════════════════════════════════

export { ROUTE_TO_ZONE };
