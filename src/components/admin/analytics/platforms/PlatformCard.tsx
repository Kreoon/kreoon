import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Zap, ExternalLink, Loader2 } from 'lucide-react';
import type { AdPlatformConfig, AdPlatform } from '@/analytics/types/platforms';
import { PLATFORM_INFO } from '@/analytics/types/platforms';

interface PlatformCardProps {
  config: AdPlatformConfig;
  onConfigure: (platform: AdPlatform) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (platform: AdPlatform) => void;
  testing: boolean;
  saving: boolean;
}

function maskToken(token: string | null): string {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  return '••••••••' + token.slice(-4);
}

export function PlatformCard({ config, onConfigure, onToggle, onTest, testing, saving }: PlatformCardProps) {
  const info = PLATFORM_INFO[config.platform];
  const hasCredentials = !!(config.pixel_id && config.access_token);

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        config.enabled
          ? `${info.bgColor} ${info.borderColor}`
          : 'bg-gray-900/30 border-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: info.color }}
          />
          <div>
            <h3 className="text-base font-semibold text-white">{info.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{info.description}</p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => onToggle(config.id, v)}
          disabled={saving || !hasCredentials}
        />
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge
          variant={config.enabled ? 'default' : 'secondary'}
          className={config.enabled ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
        >
          {config.enabled ? 'Activo' : 'Inactivo'}
        </Badge>
        {config.test_mode && config.enabled && (
          <Badge variant="outline" className="text-amber-400 border-amber-500/30">
            Test Mode
          </Badge>
        )}
        {hasCredentials && (
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            Configurado
          </Badge>
        )}
        {!hasCredentials && (
          <Badge variant="outline" className="text-red-400 border-red-500/30">
            Sin credenciales
          </Badge>
        )}
      </div>

      {/* Credential summary */}
      {hasCredentials && (
        <div className="bg-gray-800/40 rounded-lg p-3 mb-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Pixel/ID:</span>
            <span className="text-foreground/80 font-mono">{config.pixel_id}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Token:</span>
            <span className="text-foreground/80 font-mono">{maskToken(config.access_token)}</span>
          </div>
          {config.dataset_id && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Dataset:</span>
              <span className="text-foreground/80 font-mono">{config.dataset_id}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 bg-muted border-border hover:bg-muted/80 text-foreground"
          onClick={() => onConfigure(config.platform)}
        >
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          Configurar
        </Button>
        {hasCredentials && (
          <Button
            size="sm"
            variant="outline"
            className="bg-muted border-border hover:bg-muted/80 text-foreground"
            onClick={() => onTest(config.platform)}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <a
          href={info.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border bg-muted hover:bg-muted/80 text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
