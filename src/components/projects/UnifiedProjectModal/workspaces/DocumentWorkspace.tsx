import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedTabProps } from '../types';

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  collapsed?: boolean;
}

/**
 * DocumentWorkspace - Sectioned document editor for strategy_marketing projects.
 * Stores sections in formData.workspace_sections.
 */
export default function DocumentWorkspace({ formData, setFormData, editMode, readOnly }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;
  const sections: DocumentSection[] = formData.workspace_sections || [];

  const updateSections = (updated: DocumentSection[]) => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      workspace_sections: updated,
    }));
  };

  const addSection = () => {
    updateSections([
      ...sections,
      { id: `section-${Date.now()}`, title: 'Nueva Seccion', content: '', collapsed: false },
    ]);
  };

  const updateSection = (id: string, field: keyof DocumentSection, value: any) => {
    updateSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSection = (id: string) => {
    updateSections(sections.filter(s => s.id !== id));
  };

  const toggleCollapse = (id: string) => {
    updateSections(sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documento Estrategico
        </h3>
        {isEditing && (
          <Button onClick={addSection} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Seccion
          </Button>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay secciones. {isEditing ? 'Agrega una seccion para empezar.' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="border rounded-sm overflow-hidden">
              {/* Section header */}
              <div
                className={cn(
                  'flex items-center gap-2 p-3 bg-muted/30 cursor-pointer',
                  section.collapsed && 'border-b-0',
                )}
                onClick={() => toggleCollapse(section.id)}
              >
                {section.collapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground font-mono">{index + 1}.</span>

                {isEditing ? (
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm font-medium bg-transparent border-none focus-visible:ring-0 p-0"
                  />
                ) : (
                  <span className="font-medium text-sm">{section.title}</span>
                )}

                {isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Section content */}
              {!section.collapsed && (
                <div className="p-4">
                  {isEditing ? (
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                      placeholder="Escribe el contenido de esta seccion..."
                      rows={6}
                      className="resize-y"
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {section.content ? (
                        <p className="whitespace-pre-wrap text-sm">{section.content}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin contenido</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
