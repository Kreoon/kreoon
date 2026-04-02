import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Trash2, Zap } from 'lucide-react';
import type { AdPlatformConfig, AdPlatform, EventMapping, ConnectionTestResult } from '@/analytics/types/platforms';
import { PLATFORM_INFO, DEFAULT_EVENT_MAPPINGS } from '@/analytics/types/platforms';
import { MetaConfigForm } from './MetaConfigForm';
import { TikTokConfigForm } from './TikTokConfigForm';
import { GoogleConfigForm } from './GoogleConfigForm';
import { LinkedInConfigForm } from './LinkedInConfigForm';
import { EventMappingEditor } from './EventMappingEditor';
import { ConnectionTestResultDisplay } from './ConnectionTestResult';

interface PlatformConfigModalProps {
  platform: AdPlatform | null;
  config: AdPlatformConfig | undefined;
  open: boolean;
  onClose: () => void;
  onSave: (config: Partial<AdPlatformConfig> & { platform: string }) => Promise<void>;
  onDelete: (platformId: string) => Promise<void>;
  onTest: (platform: string) => Promise<ConnectionTestResult>;
  saving: boolean;
  testingPlatform: string | null;
}

interface FormData {
  pixel_id: string;
  access_token: string;
  dataset_id: string;
  test_mode: boolean;
  test_event_code: string;
  event_mapping: EventMapping;
}

function getInitialFormData(config: AdPlatformConfig | undefined, platform: AdPlatform): FormData {
  return {
    pixel_id: config?.pixel_id || '',
    access_token: '',
    dataset_id: config?.dataset_id || '',
    test_mode: config?.test_mode ?? true,
    test_event_code: config?.test_event_code || '',
    event_mapping: config?.event_mapping || { ...DEFAULT_EVENT_MAPPINGS[platform] },
  };
}

export function PlatformConfigModal({
  platform,
  config,
  open,
  onClose,
  onSave,
  onDelete,
  onTest,
  saving,
  testingPlatform,
}: PlatformConfigModalProps) {
  const [tab, setTab] = useState('credentials');
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormData(config, platform || 'meta')
  );
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Reset form when platform changes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && platform) {
        setFormData(getInitialFormData(config, platform));
        setTestResult(null);
        setTab('credentials');
      }
      if (!isOpen) onClose();
    },
    [config, platform, onClose]
  );

  if (!platform) return null;

  const info = PLATFORM_INFO[platform];
  const hasExistingToken = !!config?.access_token;
  const isTesting = testingPlatform === platform;

  const handleSave = async () => {
    await onSave({
      platform,
      pixel_id: formData.pixel_id || null,
      access_token: formData.access_token || undefined,
      dataset_id: formData.dataset_id || null,
      test_mode: formData.test_mode,
      test_event_code: formData.test_event_code || null,
      event_mapping: formData.event_mapping,
    } as Partial<AdPlatformConfig> & { platform: string });
    onClose();
  };

  const handleDelete = async () => {
    if (!config) return;
    await onDelete(config.id);
    onClose();
  };

  const handleTest = async () => {
    const result = await onTest(platform);
    setTestResult(result);
  };

  const handleCredentialChange = (data: Record<string, string | boolean>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleMappingChange = (mapping: EventMapping) => {
    setFormData((prev) => ({ ...prev, event_mapping: mapping }));
  };

  const renderForm = () => {
    const commonProps = {
      hasExistingToken,
    };

    switch (platform) {
      case 'meta':
        return (
          <MetaConfigForm
            data={{
              pixel_id: formData.pixel_id,
              access_token: formData.access_token,
              dataset_id: formData.dataset_id,
              test_mode: formData.test_mode,
              test_event_code: formData.test_event_code,
            }}
            onChange={handleCredentialChange}
            {...commonProps}
          />
        );
      case 'tiktok':
        return (
          <TikTokConfigForm
            data={{
              pixel_id: formData.pixel_id,
              access_token: formData.access_token,
              test_mode: formData.test_mode,
              test_event_code: formData.test_event_code,
            }}
            onChange={handleCredentialChange}
            {...commonProps}
          />
        );
      case 'google':
        return (
          <GoogleConfigForm
            data={{
              pixel_id: formData.pixel_id,
              access_token: formData.access_token,
              test_mode: formData.test_mode,
              test_event_code: formData.test_event_code,
            }}
            onChange={handleCredentialChange}
            {...commonProps}
          />
        );
      case 'linkedin':
        return (
          <LinkedInConfigForm
            data={{
              pixel_id: formData.pixel_id,
              access_token: formData.access_token,
              test_mode: formData.test_mode,
              test_event_code: formData.test_event_code,
            }}
            onChange={handleCredentialChange}
            {...commonProps}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl bg-gray-900 border-gray-800 text-white max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: info.color }}
            />
            <DialogTitle className="text-xl">{info.name}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
            <TabsTrigger value="credentials">Credenciales</TabsTrigger>
            <TabsTrigger value="mapping">Mapeo de Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="credentials" className="mt-4 space-y-4">
            {renderForm()}

            <ConnectionTestResultDisplay result={testResult} testing={isTesting} />
          </TabsContent>

          <TabsContent value="mapping" className="mt-4">
            <EventMappingEditor
              platform={platform}
              mapping={formData.event_mapping}
              onChange={handleMappingChange}
            />
          </TabsContent>
        </Tabs>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            {config && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar credenciales
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(config?.pixel_id || formData.pixel_id) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting || saving}
                className="bg-gray-800/50 border-gray-700"
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Zap className="h-3.5 w-3.5 mr-1" />
                )}
                Probar conexión
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
