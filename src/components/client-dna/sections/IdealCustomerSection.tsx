import React from 'react';
import { User, Brain, AlertTriangle, Heart, ShoppingCart, MessageSquare } from 'lucide-react';
import { IdealCustomer } from '@/types/client-dna';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: IdealCustomer;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

// Helper to adapt old "demographics" (plural) to new "demographic" (singular)
function getDemographic(data: any) {
  return data.demographic || data.demographics || null;
}

function getPsychographic(data: any) {
  return data.psychographic || data.psychographics || null;
}

// Helper to flatten old nested structures to string arrays
function getPainPoints(data: any): string[] {
  if (Array.isArray(data.pain_points)) return data.pain_points;
  if (data.pain_points?.primary) {
    const items = [data.pain_points.primary];
    if (data.pain_points.secondary) items.push(...data.pain_points.secondary);
    return items;
  }
  return [];
}

function getDesires(data: any): string[] {
  if (Array.isArray(data.desires)) return data.desires;
  if (data.desires && typeof data.desires === 'object') {
    return [data.desires.functional, data.desires.emotional, data.desires.social].filter(Boolean);
  }
  return [];
}

function getObjections(data: any): string[] {
  if (Array.isArray(data.objections)) return data.objections;
  if (Array.isArray(data.common_objections)) {
    return data.common_objections.map((o: any) => typeof o === 'string' ? o : o.objection).filter(Boolean);
  }
  return [];
}

function getBuyingTriggers(data: any): string[] {
  if (Array.isArray(data.buying_triggers)) return data.buying_triggers;
  if (data.psychographics?.purchase_triggers) return data.psychographics.purchase_triggers;
  return [];
}

export function IdealCustomerSection({ data, isEditing, onFieldChange }: Props) {
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);
  const demo = getDemographic(data);
  const psycho = getPsychographic(data);
  const painPoints = getPainPoints(data);
  const desires = getDesires(data);
  const objections = getObjections(data);
  const buyingTriggers = getBuyingTriggers(data);

  return (
    <div className="space-y-6">
      {/* Demographics */}
      {(demo || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-400" />
            <p className="text-sm font-medium text-blue-400">Datos Demográficos</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <DemoItem label="Edad" value={demo?.age_range} isEditing={isEditing} onChange={change('demographic.age_range') as (v: string) => void} />
            <DemoItem label="Género" value={demo?.gender} isEditing={isEditing} onChange={change('demographic.gender') as (v: string) => void} />
            <DemoItem label="Ubicación" value={demo?.location || demo?.location_context} isEditing={isEditing} onChange={change('demographic.location') as (v: string) => void} />
            <DemoItem label="Ingresos" value={demo?.income_level} isEditing={isEditing} onChange={change('demographic.income_level') as (v: string) => void} />
            <DemoItem label="Ocupación" value={demo?.occupation} isEditing={isEditing} onChange={change('demographic.occupation') as (v: string) => void} />
          </div>
        </div>
      )}

      {/* Psychographics */}
      {(psycho || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-medium text-purple-400">Perfil Psicográfico</p>
          </div>
          <div className="space-y-4">
            {(psycho?.values?.length > 0 || isEditing) && (
              isEditing ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Valores</p>
                  <EditableTags items={data.psychographic?.values || data.psychographics?.values || []} onChange={change('psychographic.values') as (v: string[]) => void} color="purple" placeholder="Agregar valor..." />
                </div>
              ) : (
                <TagList label="Valores" items={psycho.values} color="purple" />
              )
            )}
            {(psycho?.interests?.length > 0 || isEditing) && (
              isEditing ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Intereses</p>
                  <EditableTags items={data.psychographic?.interests || data.psychographics?.interests || []} onChange={change('psychographic.interests') as (v: string[]) => void} color="pink" placeholder="Agregar interés..." />
                </div>
              ) : (
                <TagList label="Intereses" items={psycho.interests} color="pink" />
              )
            )}
            {(psycho?.personality_traits?.length > 0 || isEditing) && (
              isEditing ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Rasgos de Personalidad</p>
                  <EditableTags items={data.psychographic?.personality_traits || data.psychographics?.personality_traits || []} onChange={change('psychographic.personality_traits') as (v: string[]) => void} color="blue" placeholder="Agregar rasgo..." />
                </div>
              ) : (
                <TagList label="Rasgos de Personalidad" items={psycho.personality_traits} color="blue" />
              )
            )}
            {(psycho?.lifestyle || isEditing) && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Estilo de Vida</p>
                {isEditing ? (
                  <EditableText value={data.psychographic?.lifestyle || data.psychographics?.lifestyle} onChange={change('psychographic.lifestyle') as (v: string) => void} placeholder="Estilo de vida..." />
                ) : (
                  <p className="text-sm text-foreground/80">{psycho.lifestyle}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pain Points & Desires */}
      {(painPoints.length > 0 || desires.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(painPoints.length > 0 || isEditing) && (
            <ListCard
              icon={AlertTriangle}
              title="Puntos de Dolor"
              items={painPoints}
              color="red"
              isEditing={isEditing}
              onChange={change('pain_points') as (v: string[]) => void}
              placeholder="Agregar punto de dolor..."
            />
          )}
          {(desires.length > 0 || isEditing) && (
            <ListCard
              icon={Heart}
              title="Deseos"
              items={desires}
              color="green"
              isEditing={isEditing}
              onChange={change('desires') as (v: string[]) => void}
              placeholder="Agregar deseo..."
            />
          )}
        </div>
      )}

      {/* Objections & Buying Triggers */}
      {(objections.length > 0 || buyingTriggers.length > 0 || isEditing) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(objections.length > 0 || isEditing) && (
            <ListCard
              icon={MessageSquare}
              title="Objeciones Comunes"
              items={objections}
              color="orange"
              isEditing={isEditing}
              onChange={change('objections') as (v: string[]) => void}
              placeholder="Agregar objeción..."
            />
          )}
          {(buyingTriggers.length > 0 || isEditing) && (
            <ListCard
              icon={ShoppingCart}
              title="Gatillos de Compra"
              items={buyingTriggers}
              color="emerald"
              isEditing={isEditing}
              onChange={change('buying_triggers') as (v: string[]) => void}
              placeholder="Agregar gatillo..."
            />
          )}
        </div>
      )}
    </div>
  );
}

function DemoItem({ label, value, isEditing, onChange }: { label: string; value?: string; isEditing?: boolean; onChange?: (v: string) => void }) {
  if (!value && !isEditing) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      {isEditing && onChange ? (
        <EditableText value={value} onChange={onChange} placeholder={label + '...'} />
      ) : (
        <p className="text-sm font-medium text-white">{value}</p>
      )}
    </div>
  );
}

function TagList({ label, items, color }: { label: string; items: string[]; color: string }) {
  const colorClasses = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    pink: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-lg border text-xs ${colorClasses[color as keyof typeof colorClasses]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ListCard({
  icon: Icon,
  title,
  items,
  color,
  isEditing,
  onChange,
  placeholder,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  color: string;
  isEditing?: boolean;
  onChange?: (v: string[]) => void;
  placeholder?: string;
}) {
  const colorClasses = {
    red: { bg: 'bg-red-500/5', border: 'border-red-500/20', icon: 'text-red-400', dot: 'bg-red-400' },
    green: { bg: 'bg-green-500/5', border: 'border-green-500/20', icon: 'text-green-400', dot: 'bg-green-400' },
    orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', icon: 'text-orange-400', dot: 'bg-orange-400' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  };

  const styles = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${styles.icon}`} />
        <p className={`text-sm font-medium ${styles.icon}`}>{title}</p>
      </div>
      {isEditing && onChange ? (
        <EditableTags items={items} onChange={onChange} color={color} placeholder={placeholder} />
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <div className={`w-1.5 h-1.5 rounded-full ${styles.dot} mt-1.5 flex-shrink-0`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
