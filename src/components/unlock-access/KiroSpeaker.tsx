import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { Kiro3D, type KiroState, type KiroExpression } from '@/components/kiro/Kiro3D';
import { useKiroVoice } from '@/components/kiro/hooks/useKiroVoice';
import { cn } from '@/lib/utils';

interface KiroSpeakerProps {
  userName: string;
  keysCollected: number;
}

// Mensajes de voz según el estado
const VOICE_MESSAGES: Record<number, string> = {
  0: `¡Hola! Bienvenido al acceso anticipado de KREOON.
      Ya hay marcas buscando creadores como tú en la plataforma.
      Invita a 3 amigos y desbloquea 3 meses gratis del plan Creator Pro.
      Eso incluye 18,000 tokens de IA, badge verificado y posición destacada.
      ¡No esperes a que otros se lleven las oportunidades!`,
  1: `¡Excelente! Ya tienes tu primera llave.
      Solo te faltan 2 amigos más para desbloquear todo.
      Recuerda: el 30 de abril las puertas se abren a todos.
      Los fundadores como tú tendrán ventaja competitiva.
      ¡Sigue compartiendo!`,
  2: `¡Increíble! Dos llaves conseguidas.
      Solo te falta una persona más.
      Estás a un mensaje de desbloquear 3 meses de Creator Pro gratis.
      ¡Un último esfuerzo y entras al grupo de fundadores!`,
  3: `¡Felicidades! Lo lograste.
      Eres oficialmente parte de los primeros 500 fundadores de KREOON.
      Ya tienes 3 meses de Creator Pro con todos los beneficios.
      Las marcas ya te están esperando. ¡A crear contenido y ganar dinero!`,
};

export const KiroSpeaker = memo(function KiroSpeaker({
  userName,
  keysCollected
}: KiroSpeakerProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [kiroState, setKiroState] = useState<KiroState>('idle');
  const [kiroExpression, setKiroExpression] = useState<KiroExpression>('neutral');
  const kiroRef = useRef<any>(null);

  const { speak, stop, isSpeaking, isLoading, isSupported } = useKiroVoice(
    voiceEnabled,
    0.8,
    () => {
      setKiroState('speaking');
      setKiroExpression('talking');
    },
    () => {
      setKiroState('idle');
      setKiroExpression('happy');
    }
  );

  // Hablar automáticamente al montar (solo una vez)
  useEffect(() => {
    if (!hasSpoken && voiceEnabled && isSupported) {
      const timer = setTimeout(() => {
        const message = VOICE_MESSAGES[Math.min(keysCollected, 3)];
        speak(message, keysCollected >= 3 ? 'excited' : 'friendly');
        setHasSpoken(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSpoken, voiceEnabled, isSupported, keysCollected, speak]);

  const handleReplay = () => {
    if (isSpeaking) {
      stop();
    } else {
      const message = VOICE_MESSAGES[Math.min(keysCollected, 3)];
      speak(message, keysCollected >= 3 ? 'excited' : 'friendly');
    }
  };

  const toggleVoice = () => {
    if (isSpeaking) {
      stop();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 flex flex-col items-center"
    >
      {/* KIRO 3D */}
      <div className="relative cursor-pointer" onClick={handleReplay}>
        {/* Glow when speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-purple-500/30 rounded-full blur-2xl"
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={isSpeaking ? { y: [0, -5, 0] } : {}}
          transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
        >
          <Kiro3D
            ref={kiroRef}
            size={100}
            state={kiroState}
            expression={kiroExpression}
            animate={true}
          />
        </motion.div>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
          >
            <RefreshCw className="w-3 h-3 text-white" />
          </motion.div>
        )}

        {/* Voice indicator */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleVoice(); }}
          className={cn(
            'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center',
            'transition-colors shadow-lg',
            voiceEnabled
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-white/50'
          )}
        >
          {voiceEnabled ? (
            <Volume2 className="w-3 h-3" />
          ) : (
            <VolumeX className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Status label */}
      <AnimatePresence>
        {(isSpeaking || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mt-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30"
          >
            <p className="text-xs text-purple-300">
              {isLoading ? 'Cargando...' : 'Hablando...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
