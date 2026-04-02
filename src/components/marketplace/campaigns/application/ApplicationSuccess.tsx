import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Search } from 'lucide-react';

interface ApplicationSuccessProps {
  onClose: () => void;
}

export function ApplicationSuccess({ onClose }: ApplicationSuccessProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-card border border-white/10 rounded-sm w-full max-w-md p-8 text-center">
          {/* Celebration icon */}
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Aplicacion Enviada</h2>
          <p className="text-gray-400 text-sm mb-6">
            Tu aplicacion ha sido enviada exitosamente. La marca revisara tu perfil y te notificara su decision.
          </p>

          {/* Next steps */}
          <div className="bg-white/5 rounded-sm p-4 mb-6 text-left space-y-3">
            <h3 className="text-foreground/80 text-sm font-semibold">Proximos pasos</h3>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">1</div>
              <p className="text-gray-400 text-xs">La marca revisa tu aplicacion y portafolio</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">2</div>
              <p className="text-gray-400 text-xs">Si eres seleccionado, recibiras el brief detallado</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0 mt-0.5">3</div>
              <p className="text-gray-400 text-xs">Comienzas la produccion y entregas el contenido</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { onClose(); navigate('/marketplace/creator-campaigns'); }}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              Ver mis aplicaciones
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => { onClose(); navigate('/marketplace/campaigns'); }}
              className="w-full border border-white/10 text-gray-400 py-3 rounded-sm hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              Seguir explorando campanas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
