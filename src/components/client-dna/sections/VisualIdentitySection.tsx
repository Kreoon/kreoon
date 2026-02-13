import React from 'react';
import { Palette, Type, Image, Sparkles } from 'lucide-react';
import { VisualIdentity } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: VisualIdentity;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

// Adapters for old→new data
function getPrimaryColors(data: any): string[] {
  if (Array.isArray(data.primary_colors) && data.primary_colors.length) return data.primary_colors;
  if (data.brand_colors?.length) return data.brand_colors.slice(0, Math.ceil(data.brand_colors.length / 2));
  return [];
}

function getSecondaryColors(data: any): string[] {
  if (Array.isArray(data.secondary_colors) && data.secondary_colors.length) return data.secondary_colors;
  if (data.brand_colors?.length > 1) return data.brand_colors.slice(Math.ceil(data.brand_colors.length / 2));
  return [];
}

function getColorPsychology(data: any): string | null {
  return data.color_psychology || data.color_meaning || null;
}

function getTypographyStyle(data: any): string | null {
  return data.typography_style || null;
}

function getImageryStyle(data: any): string | null {
  return data.imagery_style || data.photography_style || null;
}

function getMoodKeywords(data: any): string[] {
  if (Array.isArray(data.mood_keywords) && data.mood_keywords.length) return data.mood_keywords;
  const keywords: string[] = [];
  if (data.visual_style?.length) keywords.push(...data.visual_style);
  if (data.content_themes?.length) keywords.push(...data.content_themes);
  if (data.mood) keywords.push(data.mood);
  return keywords;
}

export function VisualIdentitySection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);
  const primaryColors = getPrimaryColors(data);
  const secondaryColors = getSecondaryColors(data);
  const colorPsychology = getColorPsychology(data);
  const typographyStyle = getTypographyStyle(data);
  const imageryStyle = getImageryStyle(data);
  const moodKeywords = getMoodKeywords(data);

  return (
    <div className="space-y-6">
      {/* Color Palettes */}
      {(primaryColors.length > 0 || secondaryColors.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(primaryColors.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-purple-400" />
                <p className="text-sm font-medium text-purple-400">Colores Primarios</p>
              </div>
              {isEditing ? (
                <EditableTags items={data.primary_colors || data.brand_colors?.slice(0, Math.ceil((data.brand_colors?.length || 0) / 2)) || []} onChange={change('primary_colors') as (v: string[]) => void} color="purple" placeholder="#hex o nombre..." />
              ) : (
                <div className="flex gap-3">
                  {primaryColors.map((color, i) => (
                    <ColorSwatch key={i} color={color} size="large" />
                  ))}
                </div>
              )}
            </div>
          )}

          {(secondaryColors.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-pink-400" />
                <p className="text-sm font-medium text-pink-400">Colores Secundarios</p>
              </div>
              {isEditing ? (
                <EditableTags items={data.secondary_colors || data.brand_colors?.slice(Math.ceil((data.brand_colors?.length || 0) / 2)) || []} onChange={change('secondary_colors') as (v: string[]) => void} color="pink" placeholder="#hex o nombre..." />
              ) : (
                <div className="flex gap-3">
                  {secondaryColors.map((color, i) => (
                    <ColorSwatch key={i} color={color} size="large" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Color Psychology */}
      {(colorPsychology || isEditing) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10
                        border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-medium text-purple-400">Psicología del Color</p>
          </div>
          {isEditing ? (
            <EditableText value={data.color_psychology || data.color_meaning} onChange={change('color_psychology') as (v: string) => void} multiline placeholder="Psicología del color..." />
          ) : (
            <p className="text-sm text-gray-300">{colorPsychology}</p>
          )}
        </div>
      )}

      {/* Typography & Imagery */}
      {(typographyStyle || imageryStyle || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(typographyStyle || isEditing) && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-blue-400">Estilo Tipográfico</p>
              </div>
              {isEditing ? (
                <EditableText value={data.typography_style} onChange={change('typography_style') as (v: string) => void} placeholder="Estilo tipográfico..." />
              ) : (
                <p className="text-sm text-white">{typographyStyle}</p>
              )}
            </div>
          )}

          {(imageryStyle || isEditing) && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">Estilo de Imágenes</p>
              </div>
              {isEditing ? (
                <EditableText value={data.imagery_style || data.photography_style} onChange={change('imagery_style') as (v: string) => void} placeholder="Estilo de imágenes..." />
              ) : (
                <p className="text-sm text-white">{imageryStyle}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mood Keywords */}
      {(moodKeywords.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Palabras Clave del Mood</p>
          {isEditing ? (
            <EditableTags items={data.mood_keywords || []} onChange={change('mood_keywords') as (v: string[]) => void} color="emerald" placeholder="Agregar keyword..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {moodKeywords.map((keyword, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20
                             border border-emerald-500/30 text-sm text-emerald-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visual Preview Mockup (display only) */}
      {!isEditing && primaryColors.length > 0 && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Vista Previa de Paleta</p>
          <div className="relative h-32 rounded-xl overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${primaryColors[0] || '#8B5CF6'} 0%, ${primaryColors[1] || '#EC4899'} 50%, ${secondaryColors[0] || '#06B6D4'} 100%)`
              }}
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white/80 text-sm font-medium mb-1">Tu Marca</p>
                <p className="text-white text-lg font-bold tracking-wide">IDENTIDAD VISUAL</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ color, size = 'medium' }: { color: string; size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(color);
  const bgStyle = isHex ? { backgroundColor: color } : {};
  const bgClass = isHex ? '' : 'bg-gradient-to-br from-purple-500 to-pink-500';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-xl border-2 border-white/20 shadow-lg ${bgClass}`}
        style={bgStyle}
      />
      <span className="text-xs text-gray-400 font-mono">{color}</span>
    </div>
  );
}
