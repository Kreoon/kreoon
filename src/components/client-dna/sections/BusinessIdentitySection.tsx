import React from 'react';
import { Quote, Sparkles, Target } from 'lucide-react';
import { BusinessIdentity } from '@/types/client-dna';
import { EditableText } from '../EditableFields';

interface Props {
  data: BusinessIdentity;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

export function BusinessIdentitySection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: string) => onFieldChange?.(path, value);

  return (
    <div className="space-y-6">
      {/* Business Name & Industry */}
      <div className="flex flex-col md:flex-row gap-4">
        {(data.name || isEditing) && (
          <InfoCard label="Nombre del Negocio" value={data.name} className="flex-1"
            isEditing={isEditing} onChange={change('name')} />
        )}
        {(data.industry || isEditing) && (
          <InfoCard label="Industria" value={data.industry} className="flex-1"
            isEditing={isEditing} onChange={change('industry')} />
        )}
      </div>

      {/* Sub-industry / Business model */}
      {(data.sub_industry || data.business_model || isEditing) && (
        <div className="flex flex-col md:flex-row gap-4">
          {(data.sub_industry || isEditing) && (
            <InfoCard label="Nicho" value={data.sub_industry} className="flex-1"
              isEditing={isEditing} onChange={change('sub_industry')} />
          )}
          {(data.business_model || isEditing) && (
            <InfoCard label="Modelo de Negocio" value={data.business_model} className="flex-1"
              isEditing={isEditing} onChange={change('business_model')} />
          )}
        </div>
      )}

      {/* Description */}
      {(data.description || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Descripción</p>
          {isEditing ? (
            <EditableText value={data.description} onChange={change('description')} multiline placeholder="Descripción del negocio..." />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.description}</p>
          )}
        </div>
      )}

      {/* Origin Story */}
      {(data.origin_story || isEditing) && (
        <div className="relative p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <div className="absolute top-3 right-3">
            <Quote className="w-8 h-8 text-purple-300 dark:text-purple-500/30" />
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">Historia de Origen</p>
          {isEditing ? (
            <EditableText value={data.origin_story} onChange={change('origin_story')} multiline placeholder="Historia de origen..." />
          ) : (
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed italic">{data.origin_story}</p>
          )}
        </div>
      )}

      {/* Mission */}
      {(data.mission || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-pink-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Misión</p>
          </div>
          {isEditing ? (
            <EditableText value={data.mission} onChange={change('mission')} multiline placeholder="Misión del negocio..." />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.mission}</p>
          )}
        </div>
      )}

      {/* Unique Factor */}
      {(data.unique_factor || isEditing) && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">Factor Único</p>
          </div>
          {isEditing ? (
            <EditableText value={data.unique_factor} onChange={change('unique_factor')} placeholder="Factor único..." />
          ) : (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{data.unique_factor}</p>
          )}
        </div>
      )}

      {/* Competitive Landscape */}
      {(data.competitive_landscape || isEditing) && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Panorama Competitivo</p>
          {isEditing ? (
            <EditableText value={data.competitive_landscape} onChange={change('competitive_landscape')} multiline placeholder="Panorama competitivo..." />
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.competitive_landscape}</p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  className = '',
  isEditing,
  onChange,
}: {
  label: string;
  value: string;
  className?: string;
  isEditing?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className={`p-4 rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50 ${className}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      {isEditing && onChange ? (
        <EditableText value={value} onChange={onChange} placeholder={label + '...'} />
      ) : (
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      )}
    </div>
  );
}
