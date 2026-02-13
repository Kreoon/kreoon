import React from 'react';
import { DollarSign, CheckCircle2, Shield, Clock } from 'lucide-react';
import { FlagshipOffer } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: FlagshipOffer;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

export function FlagshipOfferSection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);
  const price = data.price || data.price_range;

  return (
    <div className="space-y-6">
      {/* Product Name & Price */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Producto/Servicio</p>
          {isEditing ? (
            <EditableText value={data.name} onChange={change('name') as (v: string) => void} placeholder="Nombre del producto..." />
          ) : (
            <p className="text-base font-bold text-white">{data.name}</p>
          )}
        </div>
        {(price || isEditing) && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10
                          border border-green-500/20">
            <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Precio</p>
            {isEditing ? (
              <EditableText value={data.price || data.price_range} onChange={change('price') as (v: string) => void} placeholder="$..." />
            ) : (
              <p className="text-lg font-bold text-green-400">{price}</p>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {(data.description || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Descripción</p>
          {isEditing ? (
            <EditableText value={data.description} onChange={change('description') as (v: string) => void} multiline placeholder="Descripción..." />
          ) : (
            <p className="text-sm text-gray-300">{data.description}</p>
          )}
        </div>
      )}

      {/* Main Benefit */}
      {(data.main_benefit || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Beneficio Principal</p>
          {isEditing ? (
            <EditableText value={data.main_benefit} onChange={change('main_benefit') as (v: string) => void} placeholder="Beneficio principal..." />
          ) : (
            <p className="text-sm text-white font-medium">{data.main_benefit}</p>
          )}
        </div>
      )}

      {/* Price Justification */}
      {(data.price_justification || isEditing) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-400">Justificación del Precio</p>
          </div>
          {isEditing ? (
            <EditableText value={data.price_justification} onChange={change('price_justification') as (v: string) => void} multiline placeholder="Justificación..." />
          ) : (
            <p className="text-sm text-gray-300">{data.price_justification}</p>
          )}
        </div>
      )}

      {/* Included Features */}
      {(data.included_features?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">¿Qué Incluye?</p>
          {isEditing ? (
            <EditableTags items={data.included_features || []} onChange={change('included_features') as (v: string[]) => void} color="green" placeholder="Agregar feature..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.included_features?.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guarantees & Urgency */}
      {(data.guarantees?.length > 0 || data.urgency_elements?.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.guarantees?.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-blue-400" />
                <p className="text-sm font-medium text-blue-400">Garantías</p>
              </div>
              {isEditing ? (
                <EditableTags items={data.guarantees || []} onChange={change('guarantees') as (v: string[]) => void} color="blue" placeholder="Agregar garantía..." />
              ) : (
                <ul className="space-y-2">
                  {data.guarantees?.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                      {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(data.urgency_elements?.length > 0 || isEditing) && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium text-red-400">Elementos de Urgencia</p>
              </div>
              {isEditing ? (
                <EditableTags items={data.urgency_elements || []} onChange={change('urgency_elements') as (v: string[]) => void} color="red" placeholder="Agregar urgencia..." />
              ) : (
                <ul className="space-y-2">
                  {data.urgency_elements?.map((u, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
                      {u}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Funnel Role */}
      {(data.funnel_role || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Rol en Embudo</p>
          {isEditing ? (
            <EditableText value={data.funnel_role} onChange={change('funnel_role') as (v: string) => void} placeholder="Rol en embudo..." />
          ) : (
            <p className="text-sm text-gray-300">{data.funnel_role}</p>
          )}
        </div>
      )}
    </div>
  );
}
