import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Type, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
  fallbackName?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function SignatureCanvas({
  onSignatureChange,
  fallbackName = '',
  width = 400,
  height = 150,
  className,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas para alta resolución
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Fondo transparente con línea guía
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, height);

    // Línea guía para firmar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Configurar estilo de dibujo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setLastPoint(coords);
  }, [getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);

    // Suavizar la línea con curva cuadrática
    const midX = (lastPoint.x + coords.x) / 2;
    const midY = (lastPoint.y + coords.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();

    setLastPoint(coords);
    setHasSignature(true);
  }, [isDrawing, lastPoint, getCoordinates]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasSignature) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    }
    setIsDrawing(false);
    setLastPoint(null);
  }, [isDrawing, hasSignature, onSignatureChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redibujar línea guía
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    setHasSignature(false);
    onSignatureChange(null);
  }, [width, height, onSignatureChange]);

  const useTypedName = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !fallbackName) return;

    clearCanvas();

    // Dibujar nombre con fuente cursiva
    ctx.font = 'italic 32px "Dancing Script", "Brush Script MT", cursive, serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackName, width / 2, height / 2);

    setHasSignature(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  }, [fallbackName, width, height, clearCanvas, onSignatureChange]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-lg bg-white/5 cursor-crosshair touch-none"
          style={{ width, height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/30 text-sm">Firma aquí con tu dedo o mouse</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <Eraser className="w-4 h-4 mr-2" />
          Limpiar
        </Button>
        {fallbackName && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useTypedName}
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <Type className="w-4 h-4 mr-2" />
            Usar nombre
          </Button>
        )}
      </div>
    </div>
  );
}

export default SignatureCanvas;
