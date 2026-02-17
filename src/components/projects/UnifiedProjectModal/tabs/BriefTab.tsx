import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { ProjectDNASection } from '../components/ProjectDNASection';
import type { UnifiedTabProps } from '../types';
import type { BriefFieldConfig } from '@/types/unifiedProject.types';

export default function BriefTab({ project, formData, setFormData, editMode, typeConfig, readOnly }: UnifiedTabProps) {
  const brief = formData.brief || {};
  const isEditing = editMode && !readOnly;

  const updateBriefField = (key: string, value: any) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      brief: { ...prev.brief, [key]: value },
    }));
  };

  const updateDNA = (dna: any) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      brief: { ...prev.brief, dna },
    }));
  };

  // Group fields by group key
  const groupedFields = typeConfig.sections.brief.fields.reduce<Record<string, BriefFieldConfig[]>>((acc, field) => {
    const group = field.group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Project DNA section */}
      {typeConfig.sections.brief.hasProjectDNA && (
        <ProjectDNASection
          projectType={typeConfig.type}
          projectId={project?.id}
          dnaData={brief.dna || { responses: {}, audio_url: null, audio_duration: null }}
          onUpdate={updateDNA}
          editing={isEditing}
        />
      )}

      <h3 className="text-lg font-semibold">Brief del Proyecto</h3>

      {Object.entries(groupedFields).map(([group, fields]) => (
        <div key={group} className="space-y-4">
          {group !== 'general' && (
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{group}</h4>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => (
              <BriefField
                key={field.key}
                field={field}
                value={brief[field.key]}
                onChange={(val) => updateBriefField(field.key, val)}
                editing={isEditing}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Display any extra brief fields not in the config (from existing data) */}
      {Object.keys(brief).filter(k => k !== 'dna' && !typeConfig.sections.brief.fields.some(f => f.key === k) && brief[k]).length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Campos adicionales</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(brief)
              .filter(([k]) => k !== 'dna' && !typeConfig.sections.brief.fields.some(f => f.key === k))
              .filter(([, v]) => v != null && v !== '')
              .map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <p className="text-sm mt-1">{String(value)}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Individual field renderer
// ============================================================

function BriefField({
  field,
  value,
  onChange,
  editing,
}: {
  field: BriefFieldConfig;
  value: any;
  onChange: (val: any) => void;
  editing: boolean;
}) {
  const [tagInput, setTagInput] = useState('');
  const isFullWidth = field.type === 'textarea' || field.type === 'tags';

  return (
    <div className={isFullWidth ? 'md:col-span-2' : ''}>
      <label className="text-sm font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>

      {!editing ? (
        // Read-only display
        <div className="mt-1">
          {field.type === 'tags' ? (
            <div className="flex flex-wrap gap-1">
              {Array.isArray(value) && value.length > 0 ? (
                value.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          ) : (
            <p className="text-sm">{value || <span className="text-muted-foreground">-</span>}</p>
          )}
        </div>
      ) : (
        // Editable field
        <div className="mt-1">
          {field.type === 'text' && (
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'textarea' && (
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          )}

          {field.type === 'url' && (
            <Input
              type="url"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'number' && (
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'date' && (
            <Input
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}

          {field.type === 'select' && (
            <Select value={value || ''} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Seleccionar...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === 'tags' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {Array.isArray(value) && value.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button
                      onClick={() => onChange(value.filter((_: string, j: number) => j !== i))}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={field.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      onChange([...(value || []), tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    if (tagInput.trim()) {
                      onChange([...(value || []), tagInput.trim()]);
                      setTagInput('');
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
