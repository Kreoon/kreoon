import { useState } from 'react';
import { ColorPaletteSelector } from './ColorPaletteSelector';
import { PortfolioLayoutSelector } from './PortfolioLayoutSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import {
  ProfileCustomization,
  DEFAULT_PROFILE_CUSTOMIZATION,
  type AccentColorId,
  type PortfolioLayoutId
} from '@/lib/marketplace/profile-customization';

interface ProfileCustomizerProps {
  initialValues?: Partial<ProfileCustomization>;
  onSave: (customization: ProfileCustomization) => Promise<void>;
  isSaving?: boolean;
}

export function ProfileCustomizer({ initialValues, onSave, isSaving }: ProfileCustomizerProps) {
  const [customization, setCustomization] = useState<ProfileCustomization>({
    ...DEFAULT_PROFILE_CUSTOMIZATION,
    ...initialValues,
  });

  const [newLink, setNewLink] = useState({ label: '', url: '' });

  const handleColorChange = (color: AccentColorId) => {
    setCustomization(prev => ({ ...prev, accent_color: color }));
  };

  const handleLayoutChange = (layout: PortfolioLayoutId) => {
    setCustomization(prev => ({ ...prev, portfolio_layout: layout }));
  };

  const handleAddLink = () => {
    if (newLink.label && newLink.url && customization.featured_links.length < 3) {
      setCustomization(prev => ({
        ...prev,
        featured_links: [...prev.featured_links, { ...newLink }],
      }));
      setNewLink({ label: '', url: '' });
    }
  };

  const handleRemoveLink = (index: number) => {
    setCustomization(prev => ({
      ...prev,
      featured_links: prev.featured_links.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    await onSave(customization);
  };

  return (
    <div className="space-y-6">
      {/* Color accent */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color principal</CardTitle>
        </CardHeader>
        <CardContent>
          <ColorPaletteSelector
            value={customization.accent_color}
            onChange={handleColorChange}
          />
        </CardContent>
      </Card>

      {/* Portfolio layout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout de portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioLayoutSelector
            value={customization.portfolio_layout}
            onChange={handleLayoutChange}
          />
        </CardContent>
      </Card>

      {/* Featured links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links destacados (max. 3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customization.featured_links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-500 cursor-grab" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input value={link.label} disabled className="bg-white/5" />
                <Input value={link.url} disabled className="bg-white/5 text-xs" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveLink(i)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}

          {customization.featured_links.length < 3 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Etiqueta"
                  value={newLink.label}
                  onChange={e => setNewLink(prev => ({ ...prev, label: e.target.value }))}
                />
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={e => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddLink}
                disabled={!newLink.label || !newLink.url}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Guardando...' : 'Guardar personalizacion'}
      </Button>
    </div>
  );
}
