import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ConnectionTestResult as TestResult } from '@/analytics/types/platforms';

interface ConnectionTestResultProps {
  result: TestResult | null;
  testing: boolean;
}

export function ConnectionTestResultDisplay({ result, testing }: ConnectionTestResultProps) {
  if (testing) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 border border-gray-700/50 p-3 mt-3">
        <Loader2 className="h-4 w-4 animate-spin text-purple-400 shrink-0" />
        <span className="text-sm text-gray-300">Probando conexión...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg p-3 mt-3 border ${
        result.success
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      {result.success ? (
        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${result.success ? 'text-green-300' : 'text-red-300'}`}>
          {result.success ? 'Conexión exitosa' : 'Error de conexión'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{result.message}</p>
        {result.details && Object.keys(result.details).length > 0 && (
          <pre className="text-xs text-gray-500 mt-1 overflow-x-auto">
            {JSON.stringify(result.details, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
