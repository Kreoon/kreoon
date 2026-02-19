import { useState, useRef } from 'react';
import { Camera, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BasicInfoData {
  display_name: string;
  tagline: string;
  bio_full: string;
  location_city: string;
  location_country: string;
}

interface WizardStepBasicInfoProps {
  data: BasicInfoData;
  avatarUrl: string | null;
  bannerUrl: string | null;
  onChange: (data: BasicInfoData) => void;
}

const COUNTRIES = [
  { code: 'CO', label: 'Colombia' },
  { code: 'MX', label: 'Mexico' },
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Peru' },
  { code: 'AR', label: 'Argentina' },
  { code: 'EC', label: 'Ecuador' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'ES', label: 'Espana' },
];

export function WizardStepBasicInfo({ data, avatarUrl, bannerUrl, onChange }: WizardStepBasicInfoProps) {
  const update = (field: keyof BasicInfoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Tu perfil profesional</h2>
        <p className="text-gray-400 text-sm">
          Esta informacion sera visible en tu perfil del marketplace
        </p>
      </div>

      {/* Banner preview */}
      <div className="relative rounded-2xl overflow-hidden">
        <div
          className="h-40 md:h-48 bg-gradient-to-br from-purple-900/60 via-[#1a1a2e] to-blue-900/60"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        />

        {/* Avatar overlay */}
        <div className="absolute -bottom-10 left-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-card border-4 border-[#0a0a0f] overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 text-xs text-gray-500">
        Puedes cambiar tu foto y banner desde tu perfil social (Settings &gt; Perfil)
      </div>

      {/* Name & Tagline */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">Nombre profesional *</label>
          <input
            type="text"
            value={data.display_name}
            onChange={(e) => update('display_name', e.target.value)}
            placeholder="Tu nombre o nombre artistico"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">Tagline profesional</label>
          <input
            type="text"
            value={data.tagline}
            onChange={(e) => update('tagline', e.target.value.slice(0, 100))}
            placeholder="Ej: Creador de contenido lifestyle | Especialista en reels"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            maxLength={100}
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{data.tagline.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">Bio extendida del marketplace</label>
          <textarea
            value={data.bio_full}
            onChange={(e) => update('bio_full', e.target.value.slice(0, 1000))}
            placeholder="Cuenta tu historia, experiencia y que te hace unico como creador..."
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-600 mt-1 text-right">{data.bio_full.length}/1000</p>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />
              Ciudad
            </label>
            <input
              type="text"
              value={data.location_city}
              onChange={(e) => update('location_city', e.target.value)}
              placeholder="Tu ciudad"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Pais</label>
            <select
              value={data.location_country}
              onChange={(e) => update('location_country', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code} className="bg-card">{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
