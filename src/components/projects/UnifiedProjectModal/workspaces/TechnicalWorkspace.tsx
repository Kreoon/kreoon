import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Code, ExternalLink, CheckCircle, Circle } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

interface AcceptanceCriterion {
  id: string;
  text: string;
  met: boolean;
}

/**
 * TechnicalWorkspace - Specs + code workspace for technology projects.
 * Stores data in formData.workspace_technical.
 */
export default function TechnicalWorkspace({ formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;
  const tech = formData.workspace_technical || {};

  const updateTech = (key: string, value: any) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      workspace_technical: { ...prev.workspace_technical, [key]: value },
    }));
  };

  const criteria: AcceptanceCriterion[] = tech.acceptance_criteria || [];
  const metCount = criteria.filter(c => c.met).length;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Code className="h-5 w-5" />
        Especificaciones Tecnicas
      </h3>

      {/* Tech Stack */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Tech Stack</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.isArray(tech.tech_stack) && tech.tech_stack.map((item: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
          ))}
          {(!tech.tech_stack || tech.tech_stack.length === 0) && (
            <span className="text-sm text-muted-foreground">No especificado</span>
          )}
        </div>
      </div>

      {/* Repository */}
      {(tech.repository_url || isEditing) && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Repositorio</label>
          {isEditing ? (
            <Input
              value={tech.repository_url || ''}
              onChange={(e) => updateTech('repository_url', e.target.value)}
              placeholder="https://github.com/..."
              className="mt-1"
            />
          ) : tech.repository_url ? (
            <a
              href={tech.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-primary hover:underline flex items-center gap-1"
            >
              {tech.repository_url} <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}

      {/* Specifications */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Especificaciones</label>
        {isEditing ? (
          <Textarea
            value={tech.specifications || ''}
            onChange={(e) => updateTech('specifications', e.target.value)}
            placeholder="Requisitos funcionales y no funcionales..."
            rows={6}
            className="mt-1 font-mono text-sm"
          />
        ) : (
          <div className="mt-1 bg-muted/30 rounded-sm p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {tech.specifications || 'Sin especificaciones'}
            </pre>
          </div>
        )}
      </div>

      {/* Acceptance Criteria */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Criterios de Aceptacion</label>
          {criteria.length > 0 && (
            <span className="text-xs text-muted-foreground">{metCount}/{criteria.length} cumplidos</span>
          )}
        </div>
        <div className="mt-2 space-y-2">
          {criteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin criterios definidos</p>
          ) : (
            criteria.map((c: AcceptanceCriterion) => (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                {c.met ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <span className={c.met ? 'line-through text-muted-foreground' : ''}>{c.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Design URL */}
      {(tech.design_url || isEditing) && (
        <div>
          <label className="text-sm font-medium text-muted-foreground">Diseno</label>
          {isEditing ? (
            <Input
              value={tech.design_url || ''}
              onChange={(e) => updateTech('design_url', e.target.value)}
              placeholder="https://figma.com/..."
              className="mt-1"
            />
          ) : tech.design_url ? (
            <a
              href={tech.design_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver diseno <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
