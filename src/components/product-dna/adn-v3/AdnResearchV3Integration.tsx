/**
 * AdnResearchV3Integration
 * Componente de integración para lanzar ADN Recargado v3 desde cualquier vista de producto
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Loader2, CheckCircle2, Eye } from "lucide-react";
import { AdnResearchV3Modal } from "./AdnResearchV3Modal";
import { AdnResearchV3Dashboard } from "./AdnResearchV3Dashboard";
import { useAdnResearchV3 } from "@/hooks/use-adn-research-v3";
import { hasCompletedResearch } from "@/lib/services/adn-research-v3.service";
import { cn } from "@/lib/utils";

interface AdnResearchV3IntegrationProps {
  productId: string;
  productDnaId: string;
  clientDnaId?: string;
  productName: string;
  productDescription: string;
  completenessScore?: number;
  hasClientDna?: boolean;
  clientDnaName?: string;
  userTokenBalance?: number;
  className?: string;
  variant?: "button" | "card" | "compact";
  onComplete?: () => void;
}

export function AdnResearchV3Integration({
  productId,
  productDnaId,
  clientDnaId,
  productName,
  productDescription,
  completenessScore = 50,
  hasClientDna = false,
  clientDnaName,
  userTokenBalance = 5000,
  className,
  variant = "button",
  onComplete,
}: AdnResearchV3IntegrationProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hasResearch, setHasResearch] = useState(false);
  const [checkingResearch, setCheckingResearch] = useState(true);

  const { session, result, isRunning, isCompleted, loadResult } = useAdnResearchV3({
    productId,
    autoLoadSession: true,
  });

  // Check if research exists
  useEffect(() => {
    async function check() {
      setCheckingResearch(true);
      const exists = await hasCompletedResearch(productId);
      setHasResearch(exists);
      setCheckingResearch(false);
    }
    check();
  }, [productId]);

  // Load result when completed
  useEffect(() => {
    if (isCompleted && !result) {
      loadResult();
    }
  }, [isCompleted, result, loadResult]);

  const handleComplete = () => {
    setShowModal(false);
    setHasResearch(true);
    onComplete?.();
    // Auto-open dashboard
    setShowDashboard(true);
  };

  // Render based on variant
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={hasResearch ? "outline" : "default"}
                onClick={() => (hasResearch ? setShowDashboard(true) : setShowModal(true))}
                disabled={checkingResearch || isRunning}
                className={cn(
                  !hasResearch && "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                )}
              >
                {checkingResearch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {session?.current_step || 0}/{session?.total_steps || 22}
                  </>
                ) : hasResearch ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Ver ADN
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    ADN v3
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasResearch
                ? "Ver resultados del ADN Recargado"
                : "Generar ADN Recargado v3 (22 secciones)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Modal */}
        <AdnResearchV3Modal
          open={showModal}
          onOpenChange={setShowModal}
          productId={productId}
          productDnaId={productDnaId}
          clientDnaId={clientDnaId}
          productName={productName}
          productDescription={productDescription}
          completenessScore={completenessScore}
          hasClientDna={hasClientDna}
          clientDnaName={clientDnaName}
          userTokenBalance={userTokenBalance}
          onComplete={handleComplete}
        />

        {/* Dashboard Dialog */}
        <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
          <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>ADN Recargado v3</DialogTitle>
            </DialogHeader>
            {result && (
              <AdnResearchV3Dashboard
                result={result}
                productName={productName}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "p-4 rounded-xl border bg-card space-y-3",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">ADN Recargado v3</h3>
              <p className="text-xs text-muted-foreground">
                22 secciones de research completo
              </p>
            </div>
          </div>
          {hasResearch && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completado
            </Badge>
          )}
        </div>

        {isRunning && session && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span>
                {session.current_step}/{session.total_steps}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(session.current_step / session.total_steps) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {hasResearch ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDashboard(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver resultados
            </Button>
          ) : (
            <Button
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={() => setShowModal(true)}
              disabled={checkingResearch || isRunning}
            >
              {checkingResearch ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  En progreso...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar ADN
                </>
              )}
            </Button>
          )}
        </div>

        {/* Modal */}
        <AdnResearchV3Modal
          open={showModal}
          onOpenChange={setShowModal}
          productId={productId}
          productDnaId={productDnaId}
          clientDnaId={clientDnaId}
          productName={productName}
          productDescription={productDescription}
          completenessScore={completenessScore}
          hasClientDna={hasClientDna}
          clientDnaName={clientDnaName}
          userTokenBalance={userTokenBalance}
          onComplete={handleComplete}
        />

        {/* Dashboard Dialog */}
        <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
          <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>ADN Recargado v3</DialogTitle>
            </DialogHeader>
            {result && (
              <AdnResearchV3Dashboard
                result={result}
                productName={productName}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Default: button variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasResearch ? (
        <>
          <Button variant="outline" onClick={() => setShowDashboard(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Ver ADN Recargado
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowModal(true)}
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <Button
          onClick={() => setShowModal(true)}
          disabled={checkingResearch || isRunning}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {checkingResearch ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando... ({session?.current_step || 0}/{session?.total_steps || 22})
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generar ADN Recargado v3
            </>
          )}
        </Button>
      )}

      {/* Modal */}
      <AdnResearchV3Modal
        open={showModal}
        onOpenChange={setShowModal}
        productId={productId}
        productDnaId={productDnaId}
        clientDnaId={clientDnaId}
        productName={productName}
        productDescription={productDescription}
        completenessScore={completenessScore}
        hasClientDna={hasClientDna}
        clientDnaName={clientDnaName}
        userTokenBalance={userTokenBalance}
        onComplete={handleComplete}
      />

      {/* Dashboard Dialog */}
      <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>ADN Recargado v3 - {productName}</DialogTitle>
          </DialogHeader>
          {result && (
            <AdnResearchV3Dashboard
              result={result}
              productName={productName}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
