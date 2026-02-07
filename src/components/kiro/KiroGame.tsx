import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trophy, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KiroState } from './Kiro3D';
import { type KiroLevel, getRandomGamePhrase, formatPoints } from './config/gamification';
import { type AwardResult } from './hooks/useKiroGamification';
import { LevelUpCelebration } from './chat/LevelUpCelebration';
import { kiroSounds } from './sounds/KiroSounds';
import { KiroConfetti, type KiroConfettiHandle } from './animations';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface Token {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'purple' | 'gold';
}

interface KiroGameProps {
  onClose: () => void;
  onScore: (score: number) => void;
  onStateChange: (state: KiroState) => void;
  /** Mejor puntaje histórico */
  gameBestScore?: number;
  /** Partidas con bonificación restantes hoy */
  bonusesRemaining?: number;
  /** Función para otorgar puntos */
  awardPoints?: (sourceKey: string, description?: string) => Promise<AwardResult>;
  /** Función para actualizar mejor puntaje */
  updateGameBestScore?: (score: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const GAME_DURATION = 15;
const HIGH_SCORE_THRESHOLD = 20;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function KiroGame({
  onClose,
  onScore,
  onStateChange,
  gameBestScore = 0,
  bonusesRemaining = 6,
  awardPoints,
  updateGameBestScore,
}: KiroGameProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // Estado del juego
  // ─────────────────────────────────────────────────────────────────────────
  const [tokens, setTokens] = useState<Token[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Estado de gamificación
  const [upPointsEarned, setUpPointsEarned] = useState(0);
  const [bonusReason, setBonusReason] = useState<string | null>(null);
  const [levelUpResult, setLevelUpResult] = useState<{
    level: KiroLevel;
    previousLevel: KiroLevel;
  } | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // Frase motivacional
  const [motivationPhrase] = useState(() => getRandomGamePhrase());

  // Ref para el confetti
  const confettiRef = useRef<KiroConfettiHandle>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Iniciar juego
  // ─────────────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    kiroSounds.play('action_click');
    setGameStarted(true);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setTokens([]);
    setUpPointsEarned(0);
    setBonusReason(null);
    setIsNewBestScore(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Spawn tokens
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver || !gameStarted) return;

    onStateChange('playing');

    const spawnInterval = setInterval(() => {
      setTokens((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          x: 10 + Math.random() * 80,
          y: -10,
          speed: 1 + Math.random() * 2,
          type: Math.random() > 0.7 ? 'gold' : 'purple',
        },
      ]);
    }, 600);

    return () => clearInterval(spawnInterval);
  }, [gameOver, gameStarted, onStateChange]);

  // ─────────────────────────────────────────────────────────────────────────
  // Mover tokens
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver || !gameStarted) return;

    const moveInterval = setInterval(() => {
      setTokens((prev) =>
        prev
          .map((t) => ({ ...t, y: t.y + t.speed }))
          .filter((t) => t.y < 110)
      );
    }, 50);

    return () => clearInterval(moveInterval);
  }, [gameOver, gameStarted]);

  // ─────────────────────────────────────────────────────────────────────────
  // Timer y fin del juego
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameOver || !gameStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, gameStarted]);

  // ─────────────────────────────────────────────────────────────────────────
  // Procesar fin del juego (otorgar puntos)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameOver || !gameStarted) return;

    const processGameEnd = async () => {
      kiroSounds.play('game_end');
      onStateChange('celebrating');
      onScore(score);

      // Verificar si es nuevo récord
      if (score > gameBestScore) {
        setIsNewBestScore(true);
        updateGameBestScore?.(score);
        // Confetti de celebración para nuevo récord
        confettiRef.current?.trigger('celebration');
        setTimeout(() => confettiRef.current?.trigger('mini'), 400);
      } else if (score > HIGH_SCORE_THRESHOLD) {
        // Mini confetti para buen puntaje
        confettiRef.current?.trigger('mini');
      }

      // Otorgar puntos si tenemos la función
      if (awardPoints) {
        let totalPoints = 0;
        let highScoreBonus = false;

        // Puntos por jugar
        const playResult = await awardPoints('kiro_game_play');
        if (playResult.awarded) {
          totalPoints += playResult.points;

          // Verificar level up del juego normal
          if (playResult.levelUp && playResult.previousLevel) {
            setLevelUpResult({
              level: playResult.levelUp,
              previousLevel: playResult.previousLevel,
            });
          }
        } else if (playResult.reason) {
          setBonusReason(playResult.reason);
        }

        // Bonus por high score
        if (score > HIGH_SCORE_THRESHOLD) {
          const highScoreResult = await awardPoints('kiro_game_high_score');
          if (highScoreResult.awarded) {
            totalPoints += highScoreResult.points;
            highScoreBonus = true;

            // Verificar level up del bonus
            if (highScoreResult.levelUp && highScoreResult.previousLevel && !levelUpResult) {
              setLevelUpResult({
                level: highScoreResult.levelUp,
                previousLevel: highScoreResult.previousLevel,
              });
            }
          }
        }

        setUpPointsEarned(totalPoints);
      }
    };

    processGameEnd();
  }, [gameOver, gameStarted, score, gameBestScore, awardPoints, updateGameBestScore, onScore, onStateChange]);

  // ─────────────────────────────────────────────────────────────────────────
  // Atrapar token
  // ─────────────────────────────────────────────────────────────────────────
  const catchToken = useCallback((id: number, type: 'purple' | 'gold') => {
    // Reproducir sonido según tipo de token
    kiroSounds.play(type === 'gold' ? 'game_token_gold' : 'game_token_catch');
    const points = type === 'gold' ? 3 : 1;
    setScore((prev) => prev + points);
    setTokens((prev) => prev.filter((t) => t.id !== id));

    // Mini confetti para tokens dorados
    if (type === 'gold') {
      confettiRef.current?.trigger('sparkle');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Cerrar celebración de level up
  // ─────────────────────────────────────────────────────────────────────────
  const handleLevelUpClose = useCallback(() => {
    setLevelUpResult(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-[200px] bg-[#0f0f1e]/80 rounded-xl overflow-hidden border border-violet-500/20">
      {/* Confetti canvas */}
      <KiroConfetti
        ref={confettiRef}
        width={320}
        height={200}
        enabled={gameStarted}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PANTALLA DE INICIO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!gameStarted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          {/* Título */}
          <div className="text-lg font-bold text-violet-300 mb-2">
            🎮 Mini-Juego KIRO
          </div>

          {/* Mejor puntaje */}
          {gameBestScore > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span>Tu récord: {gameBestScore} pts</span>
            </div>
          )}

          {/* Bonificaciones restantes */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs mb-3',
              bonusesRemaining > 0 ? 'text-green-400' : 'text-gray-500'
            )}
          >
            <Zap className="w-3 h-3" />
            <span>
              {bonusesRemaining > 0
                ? `Partidas con bonificación: ${bonusesRemaining}/6`
                : 'Sin bonificación disponible'}
            </span>
          </div>

          {/* Frase motivacional */}
          <p className="text-sm text-gray-400 mb-4">{motivationPhrase}</p>

          {/* Botón jugar */}
          <button
            onClick={startGame}
            className={cn(
              'px-6 py-3 rounded-xl min-h-[48px]',
              'bg-violet-500/30 border border-violet-500/50',
              'text-violet-200 font-medium',
              'hover:bg-violet-500/40 transition-colors',
              'active:scale-95'
            )}
          >
            ¡Jugar! 🚀
          </button>

          {/* Cerrar */}
          <button
            onClick={() => {
              kiroSounds.play('action_click');
              onClose();
            }}
            className="absolute top-2 right-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* JUEGO EN PROGRESO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {gameStarted && !gameOver && (
        <>
          {/* Header */}
          <div className="absolute top-2 left-3 right-3 flex justify-between items-center z-10">
            <span className="font-mono text-xs text-amber-400">
              <Trophy className="w-3 h-3 inline mr-1" />
              {score} pts
            </span>
            <span
              className={cn(
                'font-mono text-xs',
                timeLeft <= 5 ? 'text-red-400' : 'text-gray-400'
              )}
            >
              {timeLeft}s
            </span>
            <button
              onClick={() => {
                kiroSounds.play('action_click');
                onClose();
              }}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Game area */}
          <div className="absolute inset-0 pt-8">
            {tokens.map((t) => (
              <div
                key={t.id}
                onClick={() => catchToken(t.id, t.type)}
                className={cn(
                  'absolute w-7 h-7 rounded-full cursor-pointer',
                  'flex items-center justify-center text-sm',
                  'transform transition-transform active:scale-90',
                  t.type === 'gold'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30'
                    : 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-500/30'
                )}
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {t.type === 'gold' ? '⭐' : '🟣'}
              </div>
            ))}
          </div>

          {/* Instructions */}
          {timeLeft === GAME_DURATION && (
            <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-500">
              ¡Toca los tokens para ganar puntos!
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PANTALLA DE FIN DE JUEGO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {gameOver && !levelUpResult && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 animate-in fade-in duration-300">
          {/* Puntaje del juego */}
          <div className="font-mono text-2xl text-amber-400 mb-1">
            <Trophy className="w-6 h-6 inline mr-2" />
            {score} pts
          </div>

          {/* Indicador de nuevo récord */}
          {isNewBestScore && (
            <div className="text-sm text-yellow-400 font-bold mb-2 animate-pulse">
              ⭐ ¡NUEVO RÉCORD! ⭐
            </div>
          )}

          <div className="text-sm text-gray-400 mb-2">¡Tokens capturados!</div>

          {/* UP Points ganados */}
          {upPointsEarned > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30 mb-2">
              <Star className="w-4 h-4 text-violet-400" />
              <span className="text-violet-300 font-medium">+{upPointsEarned} UP</span>
            </div>
          )}

          {/* Razón si no se otorgaron puntos */}
          {bonusReason && upPointsEarned === 0 && (
            <div className="text-xs text-gray-500 mb-2">
              {bonusReason}
            </div>
          )}

          {/* Botón cerrar */}
          <button
            onClick={() => {
              kiroSounds.play('action_click');
              onClose();
            }}
            className="mt-2 px-5 py-2 min-h-[44px] bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-300 text-sm hover:bg-violet-500/30 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CELEBRACIÓN DE LEVEL UP */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {levelUpResult && (
        <LevelUpCelebration
          level={levelUpResult.level}
          previousLevel={levelUpResult.previousLevel}
          pointsAwarded={upPointsEarned}
          onClose={handleLevelUpClose}
        />
      )}
    </div>
  );
}
