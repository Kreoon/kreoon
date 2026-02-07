import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { MessageCircle, Zap, Gamepad2, Bell, X, GripVertical, MapPin, Settings, Minus, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kiro3D, KIRO_STATES } from './Kiro3D';
import { KiroChat } from './KiroChat';
import { KiroActions } from './KiroActions';
import { KiroGame } from './KiroGame';
import { KiroNotificationPanel } from './KiroNotificationPanel';
import { useMouseTracking } from './hooks/useMouseTracking';
import { useKiroPersistence } from './hooks/useKiroPersistence';
import { useKiroResponsive } from './hooks/useKiroResponsive';
import { getZoneConfig } from './config/zoneActions';
import { shouldShowToast, getNotificationConfig } from './types/notifications';
import { useKiro, ZONE_INFO } from '@/contexts/KiroContext';
import { useKiroGamification } from './hooks/useKiroGamification';
import { KiroProgressBar } from './chat/KiroProgressBar';
import { LevelUpCelebration } from './chat/LevelUpCelebration';
import { KiroFloatingButton } from './mobile/KiroFloatingButton';
import { KiroBottomSheet } from './mobile/KiroBottomSheet';
import { KiroBubble } from './KiroBubble';
import { KiroSettingsPanel } from './settings/KiroSettings';
import { kiroSounds } from './sounds/KiroSounds';
import type { KiroLevel } from './config/gamification';
import type { KiroCorner } from './settings/KiroSettings';

type TabId = 'chat' | 'actions' | 'notifications' | 'game';

const TABS = [
  { id: 'chat' as const, icon: MessageCircle, label: 'Chat' },
  { id: 'actions' as const, icon: Zap, label: 'Acciones' },
  { id: 'notifications' as const, icon: Bell, label: 'Alertas' },
  { id: 'game' as const, icon: Gamepad2, label: 'Juego' },
];

export function KiroWidget() {
  // ─────────────────────────────────────────────────────────────────────────
  // Estado del contexto global
  // ─────────────────────────────────────────────────────────────────────────
  const {
    kiroState,
    expression,
    isOpen,
    isVisible,
    isMinimized,
    currentZone,
    notifications,
    unreadCount,
    preferences,
    kiroSettings,
    setKiroState,
    setExpression,
    setIsOpen,
    togglePanel,
    toggleMinimize,
    updateKiroSettings,
    voice: kiroVoice, // Phase 10
    agentic, // Phase 9
  } = useKiro();

  // Platform sync state (Phase 9)
  const isConnected = agentic.platformSyncState.connectionStatus === 'connected';

  // ─────────────────────────────────────────────────────────────────────────
  // Responsive detection
  // ─────────────────────────────────────────────────────────────────────────
  const { isMobile, isTablet, keyboardVisible, safeAreaBottom } = useKiroResponsive();

  // ─────────────────────────────────────────────────────────────────────────
  // Persistencia
  // ─────────────────────────────────────────────────────────────────────────
  const { savePosition, loadPosition } = useKiroPersistence();

  // ─────────────────────────────────────────────────────────────────────────
  // Gamificación
  // ─────────────────────────────────────────────────────────────────────────
  const {
    userPoints,
    currentLevel,
    nextLevel,
    progress,
    pointsToNext,
    gameBestScore,
    awardPoints,
    getGameBonusesRemaining,
    updateGameBestScore,
  } = useKiroGamification();

  // ─────────────────────────────────────────────────────────────────────────
  // Estado local del widget (no compartido)
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(preferences.defaultTab as TabId);
  const [isDragging, setIsDragging] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [greetingBubble, setGreetingBubble] = useState<string | null>(null);
  const [notificationToasts, setNotificationToasts] = useState<
    Array<{ id: string; title: string; icon: string }>
  >([]);

  // Estado de celebración de level up
  const [levelUpCelebration, setLevelUpCelebration] = useState<{
    level: KiroLevel;
    previousLevel: KiroLevel;
    pointsAwarded: number;
  } | null>(null);

  // Estado del panel de settings
  const [showSettings, setShowSettings] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Refs y hooks
  // ─────────────────────────────────────────────────────────────────────────
  const kiroRef = useRef<HTMLDivElement>(null);
  const mouseAngle = useMouseTracking(kiroRef);
  const positionLoaded = useRef(false);
  const lastZoneRef = useRef(currentZone);
  const zoneChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotificationCount = useRef(notifications.length);
  const toastCooldown = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar posición inicial
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (positionLoaded.current) return;
    positionLoaded.current = true;

    const savedPosition = loadPosition();
    if (savedPosition) {
      // Validar que la posición está dentro de la pantalla
      const maxX = window.innerWidth - 120;
      const maxY = window.innerHeight - 120;
      const validX = Math.max(0, Math.min(savedPosition.x, maxX));
      const validY = Math.max(0, Math.min(savedPosition.y, maxY));
      setPosition({ x: validX, y: validY });
    }
  }, [loadPosition]);

  // ─────────────────────────────────────────────────────────────────────────
  // Greeting contextual cuando cambia la zona
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Ignorar si es la misma zona
    if (currentZone === lastZoneRef.current) return;

    // Limpiar timeout anterior (debounce de 1 segundo)
    if (zoneChangeTimeout.current) {
      clearTimeout(zoneChangeTimeout.current);
    }

    // Debounce: esperar 1 segundo antes de mostrar el greeting
    zoneChangeTimeout.current = setTimeout(() => {
      // Actualizar la última zona
      const previousZone = lastZoneRef.current;
      lastZoneRef.current = currentZone;

      // Solo mostrar greeting si realmente cambió la zona
      if (previousZone !== currentZone) {
        const zoneConfig = getZoneConfig(currentZone);

        // KIRO se pone feliz por 2 segundos
        setExpression('happy');
        setTimeout(() => setExpression('neutral'), 2000);

        // Mostrar greeting según el estado del panel
        if (isOpen && activeTab === 'chat') {
          // Si el panel está abierto en el chat, enviar como mensaje de KIRO
          // (El chat mostrará el mensaje de bienvenida naturalmente)
        } else if (!isOpen) {
          // Si el panel está cerrado, mostrar bubble flotante
          setGreetingBubble(zoneConfig.greeting);

          // Ocultar después de 3 segundos
          setTimeout(() => {
            setGreetingBubble(null);
          }, 3000);
        }
      }
    }, 1000);

    return () => {
      if (zoneChangeTimeout.current) {
        clearTimeout(zoneChangeTimeout.current);
      }
    };
  }, [currentZone, isOpen, activeTab, setExpression]);

  // ─────────────────────────────────────────────────────────────────────────
  // Toast de notificaciones nuevas
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Verificar si hay nuevas notificaciones
    if (notifications.length > lastNotificationCount.current && !isOpen) {
      const newNotifications = notifications.slice(
        0,
        notifications.length - lastNotificationCount.current
      );

      // Filtrar solo las que deben mostrar toast (medium, high, urgent)
      const toastableNotifications = newNotifications.filter((n) =>
        shouldShowToast(n.priority)
      );

      // Mostrar máximo 2 toasts
      if (toastableNotifications.length > 0 && !toastCooldown.current) {
        const toastsToShow = toastableNotifications.slice(0, 2).map((n) => ({
          id: n.id,
          title: n.title,
          icon: getNotificationConfig(n.type).icon,
        }));

        setNotificationToasts(toastsToShow);

        // Activar cooldown de 2 segundos
        toastCooldown.current = true;
        setTimeout(() => {
          toastCooldown.current = false;
        }, 2000);

        // Ocultar toasts después de 4 segundos
        setTimeout(() => {
          setNotificationToasts([]);
        }, 4000);
      }
    }

    lastNotificationCount.current = notifications.length;
  }, [notifications, isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  // Easter egg: acariciar a KIRO con doble clic
  const handlePetKiro = useCallback(() => {
    if (isOpen) return;
    setPetCount((prev) => prev + 1);
    setExpression('happy');
    setTimeout(() => setExpression('neutral'), 2000);

    // Cada 5 caricias, KIRO celebra
    if (petCount > 0 && petCount % 5 === 4) {
      setKiroState('celebrating');
      setTimeout(() => setKiroState('idle'), 3000);
    }
  }, [isOpen, petCount, setExpression, setKiroState]);

  // Toggle panel (clic simple) - con sonidos
  const handleToggle = useCallback(() => {
    if (!isDragging) {
      // Reproducir sonido antes de cambiar estado
      kiroSounds.play(isOpen ? 'panel_close' : 'panel_open');
      togglePanel();
    }
  }, [isDragging, togglePanel, isOpen]);

  // Cambio de tab con sonido
  const handleTabChange = useCallback((tab: TabId) => {
    kiroSounds.play('action_click');
    setActiveTab(tab);
  }, []);

  // Abrir settings
  const handleOpenSettings = useCallback(() => {
    kiroSounds.play('action_click');
    setShowSettings(true);
  }, []);

  // Cerrar settings
  const handleCloseSettings = useCallback(() => {
    kiroSounds.play('action_click');
    setShowSettings(false);
  }, []);

  // Minimizar panel
  const handleMinimize = useCallback(() => {
    kiroSounds.play('panel_close');
    toggleMinimize();
  }, [toggleMinimize]);

  // Cerrar panel con sonido
  const handleClose = useCallback(() => {
    kiroSounds.play('panel_close');
    setIsOpen(false);
  }, [setIsOpen]);

  // Handler para cambio de esquina en mobile
  const handleCornerChange = useCallback((corner: KiroCorner) => {
    updateKiroSettings({ preferredCorner: corner });
  }, [updateKiroSettings]);

  // Pending message from quick actions → KiroChat picks it up
  const [pendingQuickMessage, setPendingQuickMessage] = useState<string | null>(null);

  // Enviar mensaje desde acciones rápidas
  const handleSendMessage = useCallback(
    (message: string) => {
      setPendingQuickMessage(message);
      setActiveTab('chat');
    },
    []
  );

  // Callback cuando termina el juego
  const handleGameScore = useCallback((score: number) => {
    console.log('[KIRO Game] Score:', score);
  }, []);

  // Wrapper de awardPoints que maneja el level up celebration
  const handleAwardPoints = useCallback(
    async (sourceKey: string, description?: string) => {
      const result = await awardPoints(sourceKey, description);

      // Si hubo level up, mostrar celebración
      if (result.levelUp && result.previousLevel) {
        setLevelUpCelebration({
          level: result.levelUp,
          previousLevel: result.previousLevel,
          pointsAwarded: result.points,
        });

        // KIRO celebra
        setKiroState('celebrating');
        setExpression('happy');
      }

      return result;
    },
    [awardPoints, setKiroState, setExpression]
  );

  // Cerrar celebración de level up
  const handleLevelUpClose = useCallback(() => {
    setLevelUpCelebration(null);
    setKiroState('idle');
    setExpression('neutral');
  }, [setKiroState, setExpression]);

  // Manejar fin del arrastre (guardar posición)
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setTimeout(() => setIsDragging(false), 100);

      // Calcular la nueva posición basada en el offset del drag
      if (kiroRef.current) {
        const rect = kiroRef.current.getBoundingClientRect();
        // La posición actual del elemento (considerando que está en bottom-right por defecto)
        const newX = rect.left;
        const newY = rect.top;

        // Guardar la posición (con debounce interno en el hook)
        savePosition(newX, newY);
        setPosition({ x: newX, y: newY });
      }
    },
    [savePosition]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // No renderizar si KIRO no es visible
  // ─────────────────────────────────────────────────────────────────────────
  if (!isVisible) {
    return null;
  }

  // Si está minimizado, no renderizar nada (el contexto maneja la persistencia)
  if (isMinimized) {
    return null;
  }

  const stateColor = KIRO_STATES[kiroState]?.color || '#a78bfa';
  const zoneInfo = ZONE_INFO[currentZone];

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENIDO COMPARTIDO DEL PANEL (usado tanto en mobile como desktop)
  // ═══════════════════════════════════════════════════════════════════════════
  const panelContent = (
    <>
      {/* Header con estado y zona */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/10">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: stateColor, boxShadow: `0 0 8px ${stateColor}50` }}
          />
          <span className="font-mono text-xs text-violet-300 uppercase tracking-wider">
            KIRO
          </span>
          <span className="text-xs text-gray-500">
            {KIRO_STATES[kiroState]?.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenSettings}
            className="p-1.5 text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
          {!isMobile && (
            <button
              onClick={handleMinimize}
              className="p-1.5 text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors"
              title="Minimizar"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Indicador de zona actual */}
      <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/5 border-b border-violet-500/10">
        <MapPin className="w-3 h-3 text-violet-400" />
        <span className="text-[11px] text-violet-300">
          {zoneInfo.icon} {zoneInfo.label}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">
          {zoneInfo.description}
        </span>
      </div>

      {/* Navegación de pestañas */}
      <div className="flex border-b border-violet-500/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5',
              'text-xs font-medium transition-all min-h-[44px]',
              activeTab === tab.id
                ? 'text-violet-300 bg-violet-500/10 border-b-2 border-violet-500'
                : 'text-gray-500 hover:text-gray-400 hover:bg-violet-500/5'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de progreso de gamificación */}
      <div className="px-3 py-2 border-b border-violet-500/5">
        <KiroProgressBar
          points={userPoints}
          level={currentLevel}
          nextLevel={nextLevel}
          progress={progress}
          pointsToNext={pointsToNext}
        />
      </div>

      {/* Contenido de pestañas */}
      <div className={cn('h-[240px]', isMobile && 'h-[calc(100%-200px)]')}>
        {activeTab === 'chat' && (
          <KiroChat
            onStateChange={setKiroState}
            currentZone={currentZone}
            speak={kiroVoice.speak}
            awardPoints={handleAwardPoints}
            pendingMessage={pendingQuickMessage}
            onPendingMessageConsumed={() => setPendingQuickMessage(null)}
          />
        )}
        {activeTab === 'actions' && (
          <KiroActions
            onStateChange={setKiroState}
            onSendMessage={handleSendMessage}
            currentZone={currentZone}
            awardPoints={handleAwardPoints}
          />
        )}
        {activeTab === 'notifications' && (
          <KiroNotificationPanel awardPoints={handleAwardPoints} />
        )}
        {activeTab === 'game' && (
          <div className="p-4">
            <KiroGame
              onClose={() => handleTabChange('chat')}
              onScore={handleGameScore}
              onStateChange={setKiroState}
              gameBestScore={gameBestScore}
              bonusesRemaining={getGameBonusesRemaining()}
              awardPoints={handleAwardPoints}
              updateGameBestScore={updateGameBestScore}
            />
          </div>
        )}
      </div>

      {/* Panel de Settings (overlay) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 bg-[#0a0a12]"
          >
            <KiroSettingsPanel
              settings={kiroSettings}
              onUpdate={updateKiroSettings}
              onBack={handleCloseSettings}
              gameBestScore={gameBestScore}
              gamesPlayedToday={6 - getGameBonusesRemaining()}
              onResetBestScore={() => updateGameBestScore(0)}
              onClearChatHistory={() => {
                console.log('[KIRO] Clear chat history');
              }}
              onResetPreferences={() => {
                updateKiroSettings({
                  soundEnabled: true,
                  soundVolume: 0.7,
                  voiceEnabled: false,
                  voiceVolume: 0.8,
                  showToasts: true,
                  onlyUrgentToasts: false,
                  visibleOnStart: true,
                  preferredCorner: 'bottom-right',
                });
              }}
              onTestVoice={() => {
                kiroVoice.speak('¡Hola! Soy KIRO, tu asistente creativo. Estoy listo para ayudarte.', 'happy');
              }}
              isVoiceSpeaking={kiroVoice.isSpeaking}
              isVoiceSupported={kiroVoice.isSupported}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZADO MOBILE
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        {/* Botón flotante mobile */}
        <KiroFloatingButton
          kiroState={kiroState}
          expression={expression}
          unreadCount={unreadCount}
          onOpen={() => {
            kiroSounds.play('panel_open');
            setIsOpen(true);
          }}
          keyboardVisible={keyboardVisible}
          preferredCorner={kiroSettings.preferredCorner}
          onCornerChange={handleCornerChange}
        />

        {/* Bottom sheet mobile */}
        <KiroBottomSheet
          isOpen={isOpen}
          onClose={() => {
            kiroSounds.play('panel_close');
            setIsOpen(false);
          }}
        >
          <div className="relative h-full overflow-hidden">
            {panelContent}
          </div>
        </KiroBottomSheet>

        {/* Celebración de Level Up (overlay global) */}
        <AnimatePresence>
          {levelUpCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
            >
              <LevelUpCelebration
                level={levelUpCelebration.level}
                previousLevel={levelUpCelebration.previousLevel}
                pointsAwarded={levelUpCelebration.pointsAwarded}
                onClose={handleLevelUpClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZADO DESKTOP/TABLET
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <motion.div
      ref={kiroRef}
      drag={!isOpen}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      dragConstraints={{
        top: 0,
        left: 0,
        right: typeof window !== 'undefined' ? window.innerWidth - 120 : 500,
        bottom: typeof window !== 'undefined' ? window.innerHeight - 120 : 500,
      }}
      initial={position ? { x: position.x, y: position.y } : false}
      className={cn(
        'fixed z-50',
        position ? 'top-0 left-0' : 'bottom-6 right-6'
      )}
      style={
        position
          ? { touchAction: 'none' as const, transform: `translate(${position.x}px, ${position.y}px)` }
          : { touchAction: 'none' as const }
      }
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GLOBO DE PENSAMIENTO (THOUGHT BUBBLE) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <KiroBubble
        isOpen={isOpen}
        kiroRef={kiroRef}
        bubbleWidth={isTablet ? 340 : 380}
        onClickOutside={handleClose}
      >
        {panelContent}
      </KiroBubble>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MASCOTA FLOTANTE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        onClick={handleToggle}
        onDoubleClick={handlePetKiro}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative cursor-pointer"
      >
        {/* Efecto glow - pulsa más rápido cuando está pensando/trabajando */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${stateColor}30 0%, transparent 70%)`,
          }}
          animate={{
            scale: kiroState === 'thinking' || kiroState === 'working'
              ? [1, 1.3, 1]
              : isOpen
                ? [1, 1.2, 1]
                : 1,
            opacity: kiroState === 'thinking' || kiroState === 'working'
              ? [0.5, 0.9, 0.5]
              : isOpen
                ? [0.5, 0.8, 0.5]
                : 0.5,
          }}
          transition={{
            duration: kiroState === 'thinking' || kiroState === 'working' ? 0.8 : 2,
            repeat: (kiroState === 'thinking' || kiroState === 'working' || isOpen) ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />

        {/* Mascota SVG */}
        <Kiro3D
          size={100}
          mouseAngle={mouseAngle}
          state={kiroState}
          expression={expression}
        />

        {/* Indicador de arrastre */}
        {!isOpen && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-60 transition-opacity">
            <GripVertical className="w-4 h-4 text-violet-400" />
          </div>
        )}

        {/* Badge de notificaciones */}
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              scale: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            className={cn(
              'absolute -top-1 -right-1',
              'w-5 h-5 rounded-full',
              'bg-red-500 border-2 border-[#0a0a12]',
              'flex items-center justify-center',
              'text-[10px] font-bold text-white',
              'shadow-lg shadow-red-500/50'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}

        {/* Indicador de zona (cuando está cerrado) */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2',
              'px-2 py-0.5 rounded-full',
              'bg-violet-500/20 border border-violet-500/30',
              'text-[9px] text-violet-300 whitespace-nowrap',
              'flex items-center gap-1'
            )}
          >
            {zoneInfo.icon}
            {/* Connection indicator (Phase 9) */}
            {isConnected ? (
              <Wifi className="w-2.5 h-2.5 text-green-400" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 text-gray-500" />
            )}
          </motion.div>
        )}

        {/* Greeting bubble flotante (cuando cambia de zona con panel cerrado) */}
        <AnimatePresence>
          {greetingBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'absolute bottom-full mb-3 right-0',
                'max-w-[200px] px-3 py-2 rounded-xl',
                'bg-[#0a0a12]/95 backdrop-blur-xl',
                'border border-violet-500/30',
                'shadow-lg shadow-violet-500/20'
              )}
            >
              {/* Puntero/flecha hacia KIRO */}
              <div
                className={cn(
                  'absolute -bottom-2 right-8',
                  'w-0 h-0',
                  'border-l-[8px] border-l-transparent',
                  'border-r-[8px] border-r-transparent',
                  'border-t-[8px] border-t-violet-500/30'
                )}
              />
              <p className="text-[11px] text-violet-200 leading-tight">
                {greetingBubble}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification toasts (cuando llegan alertas con panel cerrado) */}
        <AnimatePresence>
          {notificationToasts.length > 0 && !isOpen && !greetingBubble && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full mb-3 right-0 flex flex-col-reverse gap-1.5"
            >
              {notificationToasts.map((toast, index) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    delay: index * 0.1,
                  }}
                  onClick={() => {
                    setActiveTab('notifications');
                    setIsOpen(true);
                    setNotificationToasts([]);
                  }}
                  className={cn(
                    'max-w-[220px] px-3 py-2 rounded-xl cursor-pointer',
                    'bg-[#0a0a12]/95 backdrop-blur-xl',
                    'border border-red-500/30',
                    'shadow-lg shadow-red-500/10',
                    'hover:border-red-500/50 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{toast.icon}</span>
                    <p className="text-[11px] text-red-200 font-medium leading-tight truncate">
                      {toast.title}
                    </p>
                  </div>
                  {/* Puntero/flecha */}
                  {index === 0 && (
                    <div
                      className={cn(
                        'absolute -bottom-2 right-8',
                        'w-0 h-0',
                        'border-l-[8px] border-l-transparent',
                        'border-r-[8px] border-r-transparent',
                        'border-t-[8px] border-t-red-500/30'
                      )}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CELEBRACIÓN DE LEVEL UP (overlay global) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {levelUpCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <LevelUpCelebration
              level={levelUpCelebration.level}
              previousLevel={levelUpCelebration.previousLevel}
              pointsAwarded={levelUpCelebration.pointsAwarded}
              onClose={handleLevelUpClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
