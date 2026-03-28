import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, GripVertical, Wifi, WifiOff, Zap, Bell, Gamepad2, Settings, MessageCircle } from 'lucide-react';
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
import { LevelUpCelebration } from './chat/LevelUpCelebration';
import { KiroFloatingButton } from './mobile/KiroFloatingButton';
import { KiroBottomSheet } from './mobile/KiroBottomSheet';
import { KiroBubble } from './KiroBubble';
import { KiroSettingsPanel } from './settings/KiroSettings';
import { kiroSounds } from './sounds/KiroSounds';
import { formatPoints } from './config/gamification';
import type { KiroLevel } from './config/gamification';
import type { KiroCorner } from './settings/KiroSettings';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type ActivePanel = 'chat' | 'actions' | 'notifications' | 'game' | 'settings';

// ═══════════════════════════════════════════════════════════════════════════
// MINI PROGRESS RING — Ultra-compact gamification indicator
// ═══════════════════════════════════════════════════════════════════════════

function MiniProgressRing({ progress, level, points }: { progress: number; level: KiroLevel; points: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-1.5 group relative">
      <svg width="26" height="26" className="transform -rotate-90">
        <circle
          cx="13" cy="13" r={radius}
          fill="none"
          stroke="rgba(124, 58, 237, 0.15)"
          strokeWidth="2.5"
        />
        <circle
          cx="13" cy="13" r={radius}
          fill="none"
          stroke="url(#kiro-ring-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="kiro-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[10px] text-primary font-medium">
        {formatPoints(points)}
      </span>
      {/* Tooltip on hover */}
      <div className={cn(
        'absolute left-1/2 -translate-x-1/2 top-full mt-2',
        'px-2.5 py-1.5 rounded-sm whitespace-nowrap',
        'bg-card border border-violet-500/20',
        'text-[10px] text-muted-foreground',
        'shadow-xl shadow-black/40',
        'opacity-0 group-hover:opacity-100 pointer-events-none',
        'transition-opacity duration-200 z-50'
      )}>
        {level.emoji} {level.name} — {progress}%
      </div>
    </div>
  );
}

// Header navigation icons — directly visible, no hamburger menu
const NAV_ICONS: { id: ActivePanel; icon: typeof Zap; label: string }[] = [
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'actions', icon: Zap, label: 'Acciones' },
  { id: 'notifications', icon: Bell, label: 'Alertas' },
  { id: 'game', icon: Gamepad2, label: 'Juego' },
  { id: 'settings', icon: Settings, label: 'Config' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WIDGET COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function KiroWidget() {
  // ─── Context ───
  const {
    kiroState,
    expression,
    isOpen,
    isVisible,
    isMinimized,
    currentZone,
    notifications,
    unreadCount,
    kiroSettings,
    setKiroState,
    setExpression,
    setIsOpen,
    togglePanel,
    toggleMinimize,
    updateKiroSettings,
    voice: kiroVoice,
    agentic,
  } = useKiro();

  const isConnected = agentic.platformSyncState.connectionStatus === 'connected';

  // ─── Responsive ───
  const { isMobile, isTablet, keyboardVisible } = useKiroResponsive();

  // ─── Persistence ───
  const { savePosition, loadPosition } = useKiroPersistence();

  // ─── Gamification ───
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

  // ─── Local State ───
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [isDragging, setIsDragging] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [greetingBubble, setGreetingBubble] = useState<string | null>(null);
  const [notificationToasts, setNotificationToasts] = useState<
    Array<{ id: string; title: string; icon: string }>
  >([]);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{
    level: KiroLevel;
    previousLevel: KiroLevel;
    pointsAwarded: number;
  } | null>(null);
  const [pendingQuickMessage, setPendingQuickMessage] = useState<string | null>(null);

  // ─── Refs ───
  const kiroRef = useRef<HTMLDivElement>(null);
  const mouseAngle = useMouseTracking(kiroRef);
  const positionLoaded = useRef(false);
  const lastZoneRef = useRef(currentZone);
  const zoneChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotificationCount = useRef(notifications.length);
  const toastCooldown = useRef(false);

  // ─── Load saved position ───
  useEffect(() => {
    if (positionLoaded.current) return;
    positionLoaded.current = true;
    const savedPosition = loadPosition();
    if (savedPosition) {
      const maxX = window.innerWidth - 120;
      const maxY = window.innerHeight - 120;
      setPosition({
        x: Math.max(0, Math.min(savedPosition.x, maxX)),
        y: Math.max(0, Math.min(savedPosition.y, maxY)),
      });
    }
  }, [loadPosition]);

  // ─── Zone change greeting ───
  useEffect(() => {
    if (currentZone === lastZoneRef.current) return;
    if (zoneChangeTimeout.current) clearTimeout(zoneChangeTimeout.current);

    zoneChangeTimeout.current = setTimeout(() => {
      const previousZone = lastZoneRef.current;
      lastZoneRef.current = currentZone;

      if (previousZone !== currentZone) {
        const zoneConfig = getZoneConfig(currentZone);
        setExpression('happy');
        setTimeout(() => setExpression('neutral'), 2000);

        if (!isOpen) {
          setGreetingBubble(zoneConfig.greeting);
          setTimeout(() => setGreetingBubble(null), 3000);
        }
      }
    }, 1000);

    return () => {
      if (zoneChangeTimeout.current) clearTimeout(zoneChangeTimeout.current);
    };
  }, [currentZone, isOpen, setExpression]);

  // ─── Notification toasts ───
  useEffect(() => {
    if (notifications.length > lastNotificationCount.current && !isOpen) {
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount.current);
      const toastable = newNotifications.filter((n) => shouldShowToast(n.priority));

      if (toastable.length > 0 && !toastCooldown.current) {
        setNotificationToasts(
          toastable.slice(0, 2).map((n) => ({
            id: n.id,
            title: n.title,
            icon: getNotificationConfig(n.type).icon,
          }))
        );
        toastCooldown.current = true;
        setTimeout(() => { toastCooldown.current = false; }, 2000);
        setTimeout(() => setNotificationToasts([]), 4000);
      }
    }
    lastNotificationCount.current = notifications.length;
  }, [notifications, isOpen]);

  // ─── Handlers ───
  const handlePetKiro = useCallback(() => {
    if (isOpen) return;
    setPetCount((prev) => prev + 1);
    setExpression('happy');
    setTimeout(() => setExpression('neutral'), 2000);
    if (petCount > 0 && petCount % 5 === 4) {
      setKiroState('celebrating');
      setTimeout(() => setKiroState('idle'), 3000);
    }
  }, [isOpen, petCount, setExpression, setKiroState]);

  const handleToggle = useCallback(() => {
    if (!isDragging) {
      kiroSounds.play(isOpen ? 'panel_close' : 'panel_open');
      togglePanel();
      if (!isOpen) {
        setActivePanel('chat');
      }
    }
  }, [isDragging, togglePanel, isOpen]);

  const handleClose = useCallback(() => {
    kiroSounds.play('panel_close');
    setIsOpen(false);
    setActivePanel('chat');
  }, [setIsOpen]);

  const handleSwitchPanel = useCallback((panel: ActivePanel) => {
    kiroSounds.play('action_click');
    setActivePanel(panel);
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    setPendingQuickMessage(message);
    setActivePanel('chat');
  }, []);

  const handleCornerChange = useCallback((corner: KiroCorner) => {
    updateKiroSettings({ preferredCorner: corner });
  }, [updateKiroSettings]);

  const handleGameScore = useCallback((_score: number) => {}, []);

  const handleAwardPoints = useCallback(
    async (sourceKey: string, description?: string) => {
      const result = await awardPoints(sourceKey, description);
      if (result.levelUp && result.previousLevel) {
        setLevelUpCelebration({
          level: result.levelUp,
          previousLevel: result.previousLevel,
          pointsAwarded: result.points,
        });
        setKiroState('celebrating');
        setExpression('happy');
      }
      return result;
    },
    [awardPoints, setKiroState, setExpression]
  );

  const handleLevelUpClose = useCallback(() => {
    setLevelUpCelebration(null);
    setKiroState('idle');
    setExpression('neutral');
  }, [setKiroState, setExpression]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
      setTimeout(() => setIsDragging(false), 100);
      if (kiroRef.current) {
        const rect = kiroRef.current.getBoundingClientRect();
        savePosition(rect.left, rect.top);
        setPosition({ x: rect.left, y: rect.top });
      }
    },
    [savePosition]
  );

  // ─── Bail if not visible ───
  if (!isVisible || isMinimized) return null;

  const stateColor = KIRO_STATES[kiroState]?.color || '#a78bfa';
  const zoneInfo = ZONE_INFO[currentZone];

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL CONTENT — Minimalist design
  // ═══════════════════════════════════════════════════════════════════════════
  const panelContent = (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* ─── Header: KIRO + status + nav icons + progress + close ─── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        {/* KIRO name + status */}
        <div className="flex items-center gap-2 mr-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: stateColor, boxShadow: `0 0 8px ${stateColor}60` }}
          />
          <span className="text-[13px] font-semibold text-foreground tracking-wide">
            KIRO
          </span>
        </div>

        {/* ── Nav icon buttons ── */}
        <div className="flex items-center gap-0.5">
          {NAV_ICONS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSwitchPanel(item.id)}
              title={item.label}
              className={cn(
                'relative p-1.5 rounded-sm transition-all duration-200',
                activePanel === item.id
                  ? 'text-violet-300 bg-violet-500/15'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {/* Notification badge on bell */}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className={cn(
                  'absolute -top-0.5 -right-0.5',
                  'w-3.5 h-3.5 rounded-full text-[8px] font-bold',
                  'bg-red-500 text-white',
                  'flex items-center justify-center',
                  'shadow-sm shadow-red-500/40'
                )}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection + Progress ring */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-400/50" />
          ) : (
            <WifiOff className="w-3 h-3 text-muted-foreground/50" />
          )}
          <MiniProgressRing progress={progress} level={currentLevel} points={userPoints} />
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-accent rounded-sm transition-all duration-200 ml-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Body: direct panel rendering ─── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activePanel === 'chat' && (
            <motion.div
              key="panel-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <KiroChat
                onStateChange={setKiroState}
                currentZone={currentZone}
                speak={kiroVoice.speak}
                awardPoints={handleAwardPoints}
                pendingMessage={pendingQuickMessage}
                onPendingMessageConsumed={() => setPendingQuickMessage(null)}
              />
            </motion.div>
          )}

          {activePanel === 'actions' && (
            <motion.div
              key="panel-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <KiroActions
                onStateChange={setKiroState}
                onSendMessage={handleSendMessage}
                currentZone={currentZone}
                awardPoints={handleAwardPoints}
              />
            </motion.div>
          )}

          {activePanel === 'notifications' && (
            <motion.div
              key="panel-notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <KiroNotificationPanel awardPoints={handleAwardPoints} />
            </motion.div>
          )}

          {activePanel === 'game' && (
            <motion.div
              key="panel-game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full p-4"
            >
              <KiroGame
                onClose={() => handleSwitchPanel('chat')}
                onScore={handleGameScore}
                onStateChange={setKiroState}
                gameBestScore={gameBestScore}
                bonusesRemaining={getGameBonusesRemaining()}
                awardPoints={handleAwardPoints}
                updateGameBestScore={updateGameBestScore}
              />
            </motion.div>
          )}

          {activePanel === 'settings' && (
            <motion.div
              key="panel-settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full"
            >
              <KiroSettingsPanel
                settings={kiroSettings}
                onUpdate={updateKiroSettings}
                onBack={() => handleSwitchPanel('chat')}
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
                    voiceEnabled: true,
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
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        <KiroFloatingButton
          kiroState={kiroState}
          expression={expression}
          unreadCount={unreadCount}
          onOpen={() => {
            kiroSounds.play('panel_open');
            setIsOpen(true);
            setActivePanel('chat');
          }}
          keyboardVisible={keyboardVisible}
          preferredCorner={kiroSettings.preferredCorner}
          onCornerChange={handleCornerChange}
        />

        <KiroBottomSheet
          isOpen={isOpen}
          onClose={() => {
            kiroSounds.play('panel_close');
            setIsOpen(false);
            setActivePanel('chat');
          }}
        >
          <div className="relative h-full overflow-hidden">
            {panelContent}
          </div>
        </KiroBottomSheet>

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
  // DESKTOP RENDER
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
      {/* ═══ BUBBLE PANEL ═══ */}
      <KiroBubble
        isOpen={isOpen}
        kiroRef={kiroRef}
        bubbleWidth={isTablet ? 340 : 380}
        onClickOutside={handleClose}
      >
        {panelContent}
      </KiroBubble>

      {/* ═══ FLOATING MASCOT ═══ */}
      <motion.div
        onClick={handleToggle}
        onDoubleClick={handlePetKiro}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative cursor-pointer"
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${stateColor}30 0%, transparent 70%)`,
          }}
          animate={{
            scale: kiroState === 'thinking' || kiroState === 'working'
              ? [1, 1.3, 1]
              : isOpen ? [1, 1.2, 1] : 1,
            opacity: kiroState === 'thinking' || kiroState === 'working'
              ? [0.5, 0.9, 0.5]
              : isOpen ? [0.5, 0.8, 0.5] : 0.5,
          }}
          transition={{
            duration: kiroState === 'thinking' || kiroState === 'working' ? 0.8 : 2,
            repeat: (kiroState === 'thinking' || kiroState === 'working' || isOpen) ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />

        {/* KIRO 3D avatar */}
        <Kiro3D
          size={100}
          mouseAngle={mouseAngle}
          state={kiroState}
          expression={expression}
        />

        {/* Drag handle */}
        {!isOpen && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-60 transition-opacity">
            <GripVertical className="w-4 h-4 text-violet-400" />
          </div>
        )}

        {/* Notification badge */}
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }}
            className={cn(
              'absolute -top-1 -right-1',
              'w-5 h-5 rounded-full',
              'bg-red-500 border-2 border-background',
              'flex items-center justify-center',
              'text-[10px] font-bold text-white',
              'shadow-lg shadow-red-500/50'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}

        {/* Zone indicator (collapsed) */}
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
            {isConnected ? (
              <Wifi className="w-2.5 h-2.5 text-green-400" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 text-gray-500" />
            )}
          </motion.div>
        )}

        {/* Greeting bubble */}
        <AnimatePresence>
          {greetingBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={cn(
                'absolute bottom-full mb-3 right-0',
                'max-w-[200px] px-3 py-2 rounded-sm',
                'bg-card/95 backdrop-blur-xl',
                'border border-violet-500/30',
                'shadow-lg shadow-violet-500/20'
              )}
            >
              <div className={cn(
                'absolute -bottom-2 right-8',
                'w-0 h-0',
                'border-l-[8px] border-l-transparent',
                'border-r-[8px] border-r-transparent',
                'border-t-[8px] border-t-violet-500/30'
              )} />
              <p className="text-[11px] text-muted-foreground leading-tight">{greetingBubble}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification toasts */}
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
                  transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.1 }}
                  onClick={() => {
                    setActivePanel('notifications');
                    setIsOpen(true);
                    setNotificationToasts([]);
                  }}
                  className={cn(
                    'max-w-[220px] px-3 py-2 rounded-sm cursor-pointer',
                    'bg-card/95 backdrop-blur-xl',
                    'border border-red-500/30',
                    'shadow-lg shadow-red-500/10',
                    'hover:border-red-500/50 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{toast.icon}</span>
                    <p className="text-[11px] text-red-500 dark:text-red-200 font-medium leading-tight truncate">{toast.title}</p>
                  </div>
                  {index === 0 && (
                    <div className={cn(
                      'absolute -bottom-2 right-8',
                      'w-0 h-0',
                      'border-l-[8px] border-l-transparent',
                      'border-r-[8px] border-r-transparent',
                      'border-t-[8px] border-t-red-500/30'
                    )} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ LEVEL UP CELEBRATION ═══ */}
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
