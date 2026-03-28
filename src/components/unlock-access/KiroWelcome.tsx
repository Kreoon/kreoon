import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KiroWelcomeProps {
  userName: string;
  keysCollected: number;
}

export const KiroWelcome = memo(function KiroWelcome({
  userName,
  keysCollected
}: KiroWelcomeProps) {
  const isComplete = keysCollected >= 3;

  // Mensaje según estado
  const getMessage = () => {
    if (isComplete) {
      return `¡Felicidades ${userName}! 🎉 Ya desbloqueaste todos los beneficios. Eres parte de los primeros 500 fundadores de KREOON.`;
    }
    if (keysCollected === 0) {
      return `¡Hola ${userName}! 👋 Bienvenido al acceso anticipado. Consigue 3 llaves invitando amigos y desbloquea $497 USD en beneficios totalmente gratis.`;
    }
    if (keysCollected === 1) {
      return `¡Bien hecho ${userName}! 🔑 Ya tienes tu primera llave. Solo faltan 2 más para desbloquear todos los beneficios.`;
    }
    return `¡Casi lo logras ${userName}! 🔑🔑 Solo te falta 1 llave más. Un amigo más y desbloqueas todo.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 p-4 rounded-sm',
        'bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10',
        'border border-purple-500/20'
      )}
    >
      {/* Avatar de KIRO */}
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="shrink-0"
      >
        <div className={cn(
          'w-12 h-12 rounded-sm',
          'bg-gradient-to-br from-purple-500 to-pink-500',
          'flex items-center justify-center',
          'shadow-lg shadow-purple-500/30'
        )}>
          <span className="text-2xl">🤖</span>
        </div>
      </motion.div>

      {/* Mensaje */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-purple-300">KIRO</span>
          <span className="text-[10px] text-white/30">Asistente</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">
          {getMessage()}
        </p>
      </div>
    </motion.div>
  );
});
