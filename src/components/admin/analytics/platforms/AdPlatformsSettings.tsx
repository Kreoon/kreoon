import { useState, useCallback } from 'react';
import { Loader2, Satellite } from 'lucide-react';
import { useAdPlatformsConfig } from '@/analytics/hooks/useAdPlatformsConfig';
import type { AdPlatform, ConnectionTestResult } from '@/analytics/types/platforms';
import { ALL_PLATFORMS, DEFAULT_EVENT_MAPPINGS } from '@/analytics/types/platforms';
import { PlatformCard } from './PlatformCard';
import { PlatformConfigModal } from './PlatformConfigModal';

export function AdPlatformsSettings() {
  const {
    platforms,
    loading,
    saving,
    testingPlatform,
    savePlatform,
    deletePlatform,
    togglePlatform,
    testConnection,
    getPlatformConfig,
  } = useAdPlatformsConfig();

  const [configuringPlatform, setConfiguringPlatform] = useState<AdPlatform | null>(null);

  const handleConfigure = useCallback((platform: AdPlatform) => {
    setConfiguringPlatform(platform);
  }, []);

  const handleCloseModal = useCallback(() => {
    setConfiguringPlatform(null);
  }, []);

  const handleTest = useCallback(
    async (platform: AdPlatform) => {
      return await testConnection(platform);
    },
    [testConnection]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  // Build a map for quick access, create placeholder configs for missing platforms
  const configMap = new Map(platforms.map((p) => [p.platform, p]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Satellite className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Plataformas de Ads</h3>
          <p className="text-sm text-gray-400">
            Configura las credenciales y el mapeo de eventos para cada plataforma
          </p>
        </div>
      </div>

      {/* Platform cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_PLATFORMS.map((platform) => {
          const config = configMap.get(platform);
          // Create a placeholder for platforms not yet in DB
          const displayConfig = config || {
            id: '',
            platform,
            enabled: false,
            pixel_id: null,
            access_token: null,
            dataset_id: null,
            api_version: null,
            test_mode: true,
            test_event_code: null,
            event_mapping: DEFAULT_EVENT_MAPPINGS[platform],
            config: {},
            created_at: '',
            updated_at: '',
          };

          return (
            <PlatformCard
              key={platform}
              config={displayConfig}
              onConfigure={handleConfigure}
              onToggle={togglePlatform}
              onTest={handleTest}
              testing={testingPlatform === platform}
              saving={saving}
            />
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-800/30 border border-gray-700/30 p-4 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">
            {platforms.filter((p) => p.enabled).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Plataformas activas</p>
        </div>
        <div className="rounded-lg bg-gray-800/30 border border-gray-700/30 p-4 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">
            {platforms.filter((p) => p.pixel_id && p.access_token).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Configuradas</p>
        </div>
        <div className="rounded-lg bg-gray-800/30 border border-gray-700/30 p-4 text-center">
          <p className="text-2xl font-bold text-white tabular-nums">
            {platforms.filter((p) => p.test_mode && p.enabled).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">En modo test</p>
        </div>
      </div>

      {/* Config Modal */}
      <PlatformConfigModal
        platform={configuringPlatform}
        config={configuringPlatform ? getPlatformConfig(configuringPlatform) : undefined}
        open={!!configuringPlatform}
        onClose={handleCloseModal}
        onSave={savePlatform}
        onDelete={deletePlatform}
        onTest={testConnection}
        saving={saving}
        testingPlatform={testingPlatform}
      />
    </div>
  );
}
