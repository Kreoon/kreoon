import { useState } from "react";
import { PromptTester, type PromptTestResult } from "@/lib/ai/testing";
import { KreoonGlassCard } from "@/components/ui/kreoon/KreoonGlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

const AI_MODULES = [
  { key: "board", label: "Board AI", icon: "📋" },
  { key: "talent", label: "Talent AI", icon: "👥" },
  { key: "content", label: "Content AI", icon: "✍️" },
  { key: "portfolio", label: "Portfolio AI", icon: "💼" },
  { key: "streaming", label: "Streaming AI", icon: "📺" },
  { key: "scripts", label: "Scripts AI", icon: "🎬" },
  { key: "up", label: "UP Gamification", icon: "🎮" },
];

export function PromptTestingPanel() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, PromptTestResult[]>>({});
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const tester = new PromptTester();

  const runModuleTests = async (moduleKey: string) => {
    setLoading(true);
    setSelectedModule(moduleKey);
    setResults({});

    try {
      const moduleResults = await tester.runAllSuites(moduleKey);
      setResults(moduleResults);

      const total = Object.values(moduleResults).flat().length;
      const passed = Object.values(moduleResults)
        .flat()
        .filter((r) => r.passed).length;

      toast.success(`Tests completados: ${passed}/${total} exitosos`);
    } catch (error) {
      console.error(error);
      toast.error("Error ejecutando tests");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const report = tester.generateReport(results);
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-test-report-${selectedModule}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reporte descargado");
  };

  const toggleExpanded = (testId: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const totalTests = Object.values(results).flat().length;
  const passedTests = Object.values(results)
    .flat()
    .filter((r) => r.passed).length;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <KreoonGlassCard className="p-6" intensity="medium">
        <h2 className="mb-4 text-lg font-semibold text-white">Testing de Prompts IA</h2>
        <p className="mb-6 text-sm text-kreoon-text-secondary">
          Ejecuta test suites automáticos para validar la calidad, estructura y contenido de los
          prompts de IA.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_MODULES.map((mod) => (
            <button
              key={mod.key}
              onClick={() => runModuleTests(mod.key)}
              disabled={loading}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedModule === mod.key
                  ? "border-kreoon-purple-500 bg-kreoon-purple-500/20 shadow-kreoon-glow-sm"
                  : "border-kreoon-border bg-kreoon-bg-secondary/30 hover:border-kreoon-purple-400/50"
              }`}
            >
              <div className="mb-2 text-2xl">{mod.icon}</div>
              <h3 className="text-sm font-medium text-white">{mod.label}</h3>
              <p className="mt-1 text-xs text-kreoon-text-muted">Ejecutar suite</p>
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-kreoon-border bg-kreoon-bg-secondary/30 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-kreoon-purple-400" />
            <span className="text-sm text-kreoon-text-secondary">
              Ejecutando tests de {selectedModule}...
            </span>
          </div>
        )}
      </KreoonGlassCard>

      {totalTests > 0 && !loading && (
        <KreoonGlassCard className="p-6" intensity="medium">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Resultados</h3>
              <p className="text-sm text-kreoon-text-secondary">
                {passedTests}/{totalTests} tests pasados ({successRate}%)
              </p>
            </div>
            <Button
              onClick={downloadReport}
              variant="outline"
              size="sm"
              className="border-kreoon-border bg-kreoon-bg-secondary/50"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar reporte
            </Button>
          </div>

          <div className="mb-4 flex gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">{passedTests} exitosos</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-300">{totalTests - passedTests} fallidos</span>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(results).map(([promptId, testResults]) => (
              <div key={promptId} className="space-y-2">
                <h4 className="text-sm font-medium text-kreoon-purple-400">{promptId}</h4>
                {testResults.map((result) => (
                  <Collapsible key={result.testCase.id}>
                    <div
                      className={`rounded-lg border p-3 ${
                        result.passed
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-red-500/30 bg-red-500/5"
                      }`}
                    >
                      <CollapsibleTrigger
                        onClick={() => toggleExpanded(result.testCase.id)}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                          ) : (
                            <XCircle className="h-5 w-5 shrink-0 text-red-400" />
                          )}
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">
                              {result.testCase.name}
                            </p>
                            <p className="text-xs text-kreoon-text-muted">
                              {result.execution.duration_ms}ms · {result.execution.model}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${
                              result.testCase.priority === "critical"
                                ? "border-red-500/50 text-red-400"
                                : result.testCase.priority === "high"
                                  ? "border-amber-500/50 text-amber-400"
                                  : "border-kreoon-border text-kreoon-text-muted"
                            }`}
                          >
                            {result.testCase.priority}
                          </Badge>
                          {expandedResults.has(result.testCase.id) ? (
                            <ChevronDown className="h-4 w-4 text-kreoon-text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-kreoon-text-muted" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 space-y-2 border-t border-kreoon-border/50 pt-3">
                        <div className="text-xs text-kreoon-text-secondary">
                          <p className="mb-2 font-medium">Descripción:</p>
                          <p className="rounded bg-kreoon-bg-secondary/50 p-2">
                            {result.testCase.description}
                          </p>
                        </div>

                        {!result.validations.structure.passed && (
                          <div className="rounded border border-red-500/30 bg-red-500/10 p-2">
                            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              Errores de estructura:
                            </p>
                            <ul className="list-inside list-disc text-xs text-red-300">
                              {result.validations.structure.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!result.validations.content.passed && (
                          <div className="rounded border border-red-500/30 bg-red-500/10 p-2">
                            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              Errores de contenido:
                            </p>
                            <ul className="list-inside list-disc text-xs text-red-300">
                              {result.validations.content.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                            {result.validations.content.missing.length > 0 && (
                              <p className="mt-1 text-xs text-red-300/70">
                                Faltante: {result.validations.content.missing.join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {!result.validations.quality.passed && (
                          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Errores de calidad:
                            </p>
                            <ul className="list-inside list-disc text-xs text-amber-300">
                              {result.validations.quality.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.validations.semantic && !result.validations.semantic.passed && (
                          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                            <p className="mb-1 text-xs font-medium text-amber-400">
                              Evaluación semántica:
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              {Object.entries(result.validations.semantic.scores).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="rounded bg-kreoon-bg-secondary/50 p-1 text-center"
                                >
                                  <p className="text-kreoon-text-muted">{k}</p>
                                  <p className="font-medium text-amber-300">{v.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.passed && (
                          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-300">
                            ✓ Todas las validaciones pasaron correctamente
                          </div>
                        )}

                        <details className="mt-2 rounded border border-kreoon-border/50 bg-kreoon-bg-secondary/30">
                          <summary className="cursor-pointer p-2 text-xs font-medium text-kreoon-text-muted hover:text-white">
                            Ver respuesta completa
                          </summary>
                          <pre className="max-h-40 overflow-auto p-2 text-xs text-kreoon-text-secondary">
                            {typeof result.response.parsed === "object"
                              ? JSON.stringify(result.response.parsed, null, 2)
                              : result.response.raw}
                          </pre>
                        </details>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            ))}
          </div>
        </KreoonGlassCard>
      )}
    </div>
  );
}
