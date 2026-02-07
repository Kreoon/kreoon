import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  type KiroLevel,
  type PointSource,
  KIRO_POINT_SOURCES,
  getLevelForPoints,
  getProgressToNextLevel,
  didLevelUp,
  getPointSource,
} from '../config/gamification';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface PointTransaction {
  id: string;
  points: number;
  source: string;
  description: string;
  timestamp: number;
}

export interface AwardResult {
  /** Si se otorgaron los puntos */
  awarded: boolean;
  /** Puntos otorgados (0 si no se otorgaron) */
  points: number;
  /** Razón si no se otorgaron (cooldown, max diario, etc) */
  reason?: string;
  /** Nuevo nivel si hubo level up */
  levelUp?: KiroLevel;
  /** Nivel anterior (para celebración) */
  previousLevel?: KiroLevel;
}

interface CooldownRecord {
  timestamps: number[];
}

interface StoredUserPoints {
  totalPoints: number;
  level: number;
  lastUpdated: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  userPoints: 'kreoon_kiro_user_points',
  cooldowns: 'kreoon_kiro_cooldowns',
  transactions: 'kreoon_kiro_transactions',
  gameBestScore: 'kreoon_kiro_game_best',
};

const SYNC_INTERVAL_MS = 60000; // Sync con Supabase cada 60 segundos
const MAX_TRANSACTIONS_STORED = 50;

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE ALMACENAMIENTO LOCAL
// ═══════════════════════════════════════════════════════════════════════════

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[KiroGamification] Error guardando en localStorage:', error);
    }
  }
}

/**
 * Verifica si un timestamp es del día actual (UTC).
 */
function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getUTCFullYear() === today.getUTCFullYear() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCDate() === today.getUTCDate()
  );
}

/**
 * Obtiene el inicio del día actual en UTC.
 */
function getTodayStartUTC(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface UseKiroGamificationOptions {
  userId?: string;
}

export function useKiroGamification(options: UseKiroGamificationOptions = {}) {
  const { userId } = options;

  // ─────────────────────────────────────────────────────────────────────────
  // Estado
  // ─────────────────────────────────────────────────────────────────────────
  const [userPoints, setUserPoints] = useState<number>(0);
  const [currentLevel, setCurrentLevel] = useState<KiroLevel>(getLevelForPoints(0));
  const [progress, setProgress] = useState<number>(0);
  const [pointsToNext, setPointsToNext] = useState<number>(100);
  const [nextLevel, setNextLevel] = useState<KiroLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>([]);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [gameBestScore, setGameBestScore] = useState<number>(0);

  // Refs
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialized = useRef(false);
  const cooldownsRef = useRef<Record<string, CooldownRecord>>({});

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar estado derivado cuando cambian los puntos
  // ─────────────────────────────────────────────────────────────────────────
  const updateDerivedState = useCallback((points: number) => {
    const level = getLevelForPoints(points);
    const progressInfo = getProgressToNextLevel(points);

    setCurrentLevel(level);
    setProgress(progressInfo.progress);
    setPointsToNext(progressInfo.pointsNeeded);
    setNextLevel(progressInfo.next);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar puntos del usuario
  // ─────────────────────────────────────────────────────────────────────────
  const fetchUserPoints = useCallback(async () => {
    setIsLoading(true);

    // Primero cargar desde localStorage como cache
    const storedPoints = loadFromStorage<StoredUserPoints | null>(STORAGE_KEYS.userPoints, null);
    if (storedPoints) {
      setUserPoints(storedPoints.totalPoints);
      updateDerivedState(storedPoints.totalPoints);
    }

    // Cargar mejor puntaje del juego
    const bestScore = loadFromStorage<number>(STORAGE_KEYS.gameBestScore, 0);
    setGameBestScore(bestScore);

    // Cargar transacciones recientes
    const storedTransactions = loadFromStorage<PointTransaction[]>(STORAGE_KEYS.transactions, []);
    setRecentTransactions(storedTransactions.slice(0, 10));

    // Intentar sincronizar con Supabase si hay userId
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          // Si la tabla no existe o hay otro error, usar localStorage
          if (error.code === 'PGRST116' || error.code === '42P01') {
            console.warn('[KiroGamification] Tabla user_points no encontrada, usando localStorage');
            setUseLocalStorage(true);
          } else if (error.code === 'PGRST116') {
            // No hay registro para este usuario, crear uno
            const { error: insertError } = await supabase
              .from('user_points')
              .insert({ user_id: userId, total_points: storedPoints?.totalPoints || 0, level: 1 });

            if (insertError) {
              console.warn('[KiroGamification] Error creando registro, usando localStorage');
              setUseLocalStorage(true);
            }
          } else {
            console.warn('[KiroGamification] Error consultando Supabase:', error.message);
            setUseLocalStorage(true);
          }
        } else if (data) {
          // Sincronizar: usar el mayor valor entre local y remoto
          const remotePoints = data.total_points || 0;
          const localPoints = storedPoints?.totalPoints || 0;
          const finalPoints = Math.max(remotePoints, localPoints);

          setUserPoints(finalPoints);
          updateDerivedState(finalPoints);

          // Guardar en localStorage
          saveToStorage(STORAGE_KEYS.userPoints, {
            totalPoints: finalPoints,
            level: getLevelForPoints(finalPoints).level,
            lastUpdated: Date.now(),
          });
        }
      } catch (err) {
        console.warn('[KiroGamification] Error de conexión, usando localStorage');
        setUseLocalStorage(true);
      }
    } else {
      // Sin userId, usar solo localStorage
      setUseLocalStorage(true);
    }

    setIsLoading(false);
  }, [userId, updateDerivedState]);

  // ─────────────────────────────────────────────────────────────────────────
  // Validar cooldown
  // ─────────────────────────────────────────────────────────────────────────
  const validateCooldown = useCallback((source: PointSource): { valid: boolean; reason?: string; minutesLeft?: number } => {
    const now = Date.now();
    const cooldowns = cooldownsRef.current;
    const sourceKey = source.key;

    // Obtener timestamps de este source
    const sourceTimestamps = cooldowns[sourceKey]?.timestamps || [];

    // Filtrar solo timestamps de hoy
    const todayTimestamps = sourceTimestamps.filter(isToday);

    // Validar maxPerDay
    if (todayTimestamps.length >= source.maxPerDay) {
      return {
        valid: false,
        reason: `Máximo diario alcanzado (${source.maxPerDay}/${source.maxPerDay})`,
      };
    }

    // Validar cooldown en minutos
    if (source.cooldownMinutes !== null && todayTimestamps.length > 0) {
      const lastTimestamp = Math.max(...todayTimestamps);
      const cooldownMs = source.cooldownMinutes * 60 * 1000;
      const elapsed = now - lastTimestamp;

      if (elapsed < cooldownMs) {
        const minutesLeft = Math.ceil((cooldownMs - elapsed) / 60000);
        return {
          valid: false,
          reason: `Cooldown activo`,
          minutesLeft,
        };
      }
    }

    return { valid: true };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Otorgar puntos
  // ─────────────────────────────────────────────────────────────────────────
  const awardPoints = useCallback(
    async (sourceKey: string, customDescription?: string): Promise<AwardResult> => {
      const source = getPointSource(sourceKey);

      // Si no es una fuente conocida, permitir puntos custom
      const points = source?.points || 0;
      const description = customDescription || source?.description || sourceKey;

      if (source) {
        // Validar cooldown
        const validation = validateCooldown(source);
        if (!validation.valid) {
          return {
            awarded: false,
            points: 0,
            reason: validation.reason,
          };
        }
      }

      // Puntos anteriores para detectar level up
      const previousPoints = userPoints;
      const previousLevel = currentLevel;
      const newPoints = previousPoints + points;

      // Registrar cooldown
      if (source) {
        const cooldowns = cooldownsRef.current;
        if (!cooldowns[sourceKey]) {
          cooldowns[sourceKey] = { timestamps: [] };
        }
        cooldowns[sourceKey].timestamps.push(Date.now());
        // Limpiar timestamps viejos (más de 24 horas)
        cooldowns[sourceKey].timestamps = cooldowns[sourceKey].timestamps.filter(
          (ts) => Date.now() - ts < 24 * 60 * 60 * 1000
        );
        saveToStorage(STORAGE_KEYS.cooldowns, cooldowns);
      }

      // Crear transacción
      const transaction: PointTransaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        points,
        source: sourceKey,
        description,
        timestamp: Date.now(),
      };

      // Actualizar estado local
      setUserPoints(newPoints);
      updateDerivedState(newPoints);

      // Agregar a transacciones recientes
      setRecentTransactions((prev) => {
        const updated = [transaction, ...prev].slice(0, 10);
        return updated;
      });

      // Guardar en localStorage
      saveToStorage(STORAGE_KEYS.userPoints, {
        totalPoints: newPoints,
        level: getLevelForPoints(newPoints).level,
        lastUpdated: Date.now(),
      });

      // Guardar transacciones
      const storedTransactions = loadFromStorage<PointTransaction[]>(STORAGE_KEYS.transactions, []);
      const updatedTransactions = [transaction, ...storedTransactions].slice(0, MAX_TRANSACTIONS_STORED);
      saveToStorage(STORAGE_KEYS.transactions, updatedTransactions);

      // Intentar sincronizar con Supabase (fire and forget)
      if (userId && !useLocalStorage) {
        try {
          // Insertar transacción
          supabase
            .from('point_transactions')
            .insert({
              user_id: userId,
              points,
              source: sourceKey,
              description,
            })
            .then(() => {});

          // Actualizar total de puntos
          supabase
            .from('user_points')
            .upsert({
              user_id: userId,
              total_points: newPoints,
              level: getLevelForPoints(newPoints).level,
              updated_at: new Date().toISOString(),
            })
            .then(() => {});
        } catch {
          // Silenciosamente fallar, ya está en localStorage
        }
      }

      // Verificar level up
      const levelUpResult = didLevelUp(previousPoints, newPoints);

      return {
        awarded: true,
        points,
        levelUp: levelUpResult || undefined,
        previousLevel: levelUpResult ? previousLevel : undefined,
      };
    },
    [userPoints, currentLevel, userId, useLocalStorage, validateCooldown, updateDerivedState]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Obtener partidas con bonificación restantes
  // ─────────────────────────────────────────────────────────────────────────
  const getGameBonusesRemaining = useCallback((): number => {
    const source = getPointSource('kiro_game_play');
    if (!source) return 0;

    const cooldowns = cooldownsRef.current;
    const timestamps = cooldowns['kiro_game_play']?.timestamps || [];
    const todayCount = timestamps.filter(isToday).length;

    return Math.max(0, source.maxPerDay - todayCount);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar mejor puntaje del juego
  // ─────────────────────────────────────────────────────────────────────────
  const updateGameBestScore = useCallback((score: number) => {
    if (score > gameBestScore) {
      setGameBestScore(score);
      saveToStorage(STORAGE_KEYS.gameBestScore, score);
    }
  }, [gameBestScore]);

  // ─────────────────────────────────────────────────────────────────────────
  // Limpiar cooldowns del día anterior
  // ─────────────────────────────────────────────────────────────────────────
  const resetDailyCooldowns = useCallback(() => {
    const stored = loadFromStorage<Record<string, CooldownRecord>>(STORAGE_KEYS.cooldowns, {});
    const todayStart = getTodayStartUTC();

    // Filtrar timestamps que son de hoy
    const cleaned: Record<string, CooldownRecord> = {};
    for (const [key, record] of Object.entries(stored)) {
      const todayTimestamps = record.timestamps.filter((ts) => ts >= todayStart);
      if (todayTimestamps.length > 0) {
        cleaned[key] = { timestamps: todayTimestamps };
      }
    }

    cooldownsRef.current = cleaned;
    saveToStorage(STORAGE_KEYS.cooldowns, cleaned);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Verificar si es el primer saludo del día
  // ─────────────────────────────────────────────────────────────────────────
  const isFirstGreetingToday = useCallback((): boolean => {
    const cooldowns = cooldownsRef.current;
    const timestamps = cooldowns['kiro_daily_greeting']?.timestamps || [];
    return !timestamps.some(isToday);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Efectos de inicialización
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Cargar cooldowns
    cooldownsRef.current = loadFromStorage<Record<string, CooldownRecord>>(STORAGE_KEYS.cooldowns, {});

    // Limpiar cooldowns del día anterior
    resetDailyCooldowns();

    // Cargar puntos
    fetchUserPoints();

    // Configurar sync periódico con Supabase
    syncTimerRef.current = setInterval(() => {
      if (userId && !useLocalStorage) {
        fetchUserPoints();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [fetchUserPoints, resetDailyCooldowns, userId, useLocalStorage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Estado
    userPoints,
    currentLevel,
    nextLevel,
    progress,
    pointsToNext,
    isLoading,
    recentTransactions,
    gameBestScore,

    // Funciones
    awardPoints,
    getGameBonusesRemaining,
    updateGameBestScore,
    isFirstGreetingToday,
    refetch: fetchUserPoints,
  };
}
