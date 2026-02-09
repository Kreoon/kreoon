import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HiringSuccessProps {
  creatorName: string;
  packageName: string;
  projectId?: string;
}

export function HiringSuccess({ creatorName, packageName }: HiringSuccessProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center text-center py-8 space-y-6">
      {/* Success icon with animation */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce-slow">
          <CheckCircle2 className="h-12 w-12 text-green-400" />
        </div>
        {/* Confetti dots */}
        <div className="absolute -top-2 -left-2 w-3 h-3 rounded-full bg-purple-400 animate-ping" />
        <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-pink-400 animate-ping [animation-delay:200ms]" />
        <div className="absolute bottom-0 -left-3 w-2 h-2 rounded-full bg-cyan-400 animate-ping [animation-delay:400ms]" />
        <div className="absolute -bottom-1 -right-2 w-3 h-3 rounded-full bg-yellow-400 animate-ping [animation-delay:300ms]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Proyecto enviado</h2>
        <p className="text-gray-400 max-w-md">
          Tu proyecto con <span className="text-purple-400 font-semibold">{creatorName}</span> ha sido
          creado exitosamente. El creador recibira tu brief y comenzara pronto.
        </p>
      </div>

      {/* Timeline */}
      <div className="w-full max-w-sm space-y-4 text-left">
        <h3 className="text-sm font-semibold text-gray-300 text-center">Proximos pasos</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Brief enviado</p>
              <p className="text-gray-500 text-xs">El creador revisara tu brief</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-purple-300 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-gray-300 text-sm font-medium">Produccion</p>
              <p className="text-gray-500 text-xs">El creador graba y edita tu contenido</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-purple-300 text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-gray-300 text-sm font-medium">Entrega y revision</p>
              <p className="text-gray-500 text-xs">Revisa, aprueba o pide cambios</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-4">
        <button
          onClick={() => navigate('/board?view=marketplace')}
          className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold py-3 px-5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          Ver mis proyectos
        </button>
        <button
          onClick={() => navigate('/marketplace')}
          className="flex-1 border border-white/20 text-white font-semibold py-3 px-5 rounded-xl text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2"
        >
          Marketplace
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Package reminder */}
      <p className="text-gray-600 text-xs">
        Paquete: {packageName}
      </p>
    </div>
  );
}
