import React from 'react';
import { AlertCircle, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { ValueProposition } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: ValueProposition;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

export function ValuePropositionSection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);

  return (
    <div className="space-y-6">
      {/* Problem & Solution */}
      {(data.main_problem_solved || data.solution_description || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.main_problem_solved || isEditing) && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-sm font-medium text-red-400">Problema que Resuelves</p>
              </div>
              {isEditing ? (
                <EditableText value={data.main_problem_solved} onChange={change('main_problem_solved') as (v: string) => void} multiline placeholder="Problema principal..." />
              ) : (
                <p className="text-sm text-gray-300">{data.main_problem_solved}</p>
              )}
            </div>
          )}

          {(data.solution_description || isEditing) && (
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-sm font-medium text-green-400">Tu Solución</p>
              </div>
              {isEditing ? (
                <EditableText value={data.solution_description} onChange={change('solution_description') as (v: string) => void} multiline placeholder="Tu solución..." />
              ) : (
                <p className="text-sm text-gray-300">{data.solution_description}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key Benefits */}
      {(data.key_benefits?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Beneficios Clave</p>
          {isEditing ? (
            <EditableTags items={data.key_benefits || []} onChange={change('key_benefits') as (v: string[]) => void} color="green" placeholder="Agregar beneficio..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.key_benefits?.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transformation Promise */}
      {(data.transformation_promise || isEditing) && (
        <div className="relative p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10
                        border border-purple-500/20 overflow-hidden">
          <div className="absolute top-2 right-2">
            <Sparkles className="w-6 h-6 text-purple-500/30" />
          </div>
          <p className="text-xs text-purple-400 uppercase tracking-wider mb-2">Promesa de Transformación</p>
          {isEditing ? (
            <EditableText value={data.transformation_promise} onChange={change('transformation_promise') as (v: string) => void} multiline placeholder="Promesa de transformación..." />
          ) : (
            <p className="text-sm text-white font-medium leading-relaxed">{data.transformation_promise}</p>
          )}
        </div>
      )}

      {/* Proof Points */}
      {(data.proof_points?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Puntos de Prueba</p>
          {isEditing ? (
            <EditableTags items={data.proof_points || []} onChange={change('proof_points') as (v: string[]) => void} color="pink" placeholder="Agregar punto de prueba..." />
          ) : (
            <div className="space-y-2">
              {data.proof_points?.map((proof, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <ArrowRight className="w-3 h-3 text-pink-400" />
                  {proof}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fallback: old fields */}
      {!data.main_problem_solved && (data.main_usp || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">USP Principal</p>
          {isEditing ? (
            <EditableText value={data.main_usp} onChange={change('main_usp') as (v: string) => void} multiline placeholder="USP principal..." />
          ) : (
            <p className="text-sm text-white font-medium">{data.main_usp}</p>
          )}
        </div>
      )}
      {!data.transformation_promise && (data.brand_promise || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Promesa de Marca</p>
          {isEditing ? (
            <EditableText value={data.brand_promise} onChange={change('brand_promise') as (v: string) => void} multiline placeholder="Promesa de marca..." />
          ) : (
            <p className="text-sm text-gray-300">{data.brand_promise}</p>
          )}
        </div>
      )}
      {!data.key_benefits?.length && (data.differentiators?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Diferenciadores</p>
          {isEditing ? (
            <EditableTags items={data.differentiators || []} onChange={change('differentiators') as (v: string[]) => void} color="pink" placeholder="Agregar diferenciador..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.differentiators?.map((d, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
