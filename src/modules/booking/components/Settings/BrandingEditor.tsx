// Editor de personalización de marca para la página de booking

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Palette,
  Upload,
  Image,
  Type,
  Eye,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { BookingBranding, BookingBrandingInput } from '../../types';

interface BrandingEditorProps {
  branding: BookingBranding | null;
  onSave: (branding: BookingBrandingInput) => Promise<void>;
  onUploadLogo?: (file: File) => Promise<string>;
  previewUrl?: string;
  isLoading?: boolean;
}

const DEFAULT_COLORS = [
  '#8B5CF6', // Violet (default)
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#000000', // Black
];

export function BrandingEditor({
  branding,
  onSave,
  onUploadLogo,
  previewUrl,
  isLoading,
}: BrandingEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color || '#8B5CF6');
  const [accentColor, setAccentColor] = useState(branding?.accent_color || '');
  const [backgroundColor, setBackgroundColor] = useState(branding?.background_color || '#FFFFFF');
  const [welcomeText, setWelcomeText] = useState(branding?.welcome_text || '');
  const [footerText, setFooterText] = useState(branding?.footer_text || '');
  const [showKreoonBranding, setShowKreoonBranding] = useState(branding?.show_kreoon_branding ?? true);
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadLogo) return;

    setUploading(true);
    try {
      const url = await onUploadLogo(file);
      setLogoUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        logo_url: logoUrl || undefined,
        primary_color: primaryColor,
        accent_color: accentColor || undefined,
        background_color: backgroundColor,
        welcome_text: welcomeText || undefined,
        footer_text: footerText || undefined,
        show_kreoon_branding: showKreoonBranding,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    primaryColor !== (branding?.primary_color || '#8B5CF6') ||
    accentColor !== (branding?.accent_color || '') ||
    backgroundColor !== (branding?.background_color || '#FFFFFF') ||
    welcomeText !== (branding?.welcome_text || '') ||
    footerText !== (branding?.footer_text || '') ||
    showKreoonBranding !== (branding?.show_kreoon_branding ?? true) ||
    logoUrl !== (branding?.logo_url || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Personalización de marca
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Personaliza la apariencia de tu página de reservas
          </p>
        </div>
        {previewUrl && (
          <Button variant="outline" asChild className="rounded-lg">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              Vista previa
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        )}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-50">
            <Image className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">Logo</h4>
            <p className="text-sm text-slate-500">
              Se mostrará en la parte superior de tu página de reservas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative group">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-slate-50"
              />
              <button
                onClick={() => setLogoUrl('')}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
              <Image className="w-8 h-8 text-slate-300" />
            </div>
          )}

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploading || !onUploadLogo}
            />
            <div className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {logoUrl ? 'Cambiar logo' : 'Subir logo'}
            </div>
          </label>
        </div>
      </motion.div>

      {/* Colores */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-50">
            <Palette className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">Colores</h4>
            <p className="text-sm text-slate-500">
              Define los colores de tu página de reservas
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-slate-700 mb-2 block">
              Color principal
            </Label>
            <div className="flex items-center gap-3">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setPrimaryColor(color)}
                  className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    border: primaryColor === color ? '3px solid #000' : '2px solid transparent',
                    boxShadow: primaryColor === color ? '0 0 0 2px white' : 'none',
                  }}
                />
              ))}
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-8 p-0 border-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-700 mb-2 block">
                Color de acento (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={accentColor || primaryColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-8 p-0 border-none cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-2 block">
                Fondo
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-8 p-0 border-none cursor-pointer"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Textos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-50">
            <Type className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">Textos personalizados</h4>
            <p className="text-sm text-slate-500">
              Agrega mensajes personalizados a tu página
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-slate-700 mb-2 block">
              Texto de bienvenida
            </Label>
            <Textarea
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              placeholder="Ej: ¡Hola! Reserva una cita conmigo fácilmente."
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            <Label className="text-sm text-slate-700 mb-2 block">
              Texto del pie de página
            </Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Ej: © 2026 Tu Empresa"
            />
          </div>
        </div>
      </motion.div>

      {/* Kreoon branding */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <span className="text-lg font-bold text-slate-700">K</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">
                Mostrar "Powered by Kreoon"
              </h4>
              <p className="text-sm text-slate-500">
                Muestra un pequeño badge de Kreoon en tu página
              </p>
            </div>
          </div>
          <Switch
            checked={showKreoonBranding}
            onCheckedChange={setShowKreoonBranding}
            className="data-[state=checked]:bg-violet-500"
          />
        </div>
      </motion.div>

      {/* Guardar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="bg-violet-600 hover:bg-violet-700 rounded-lg px-6"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </motion.div>
      )}
    </div>
  );
}
