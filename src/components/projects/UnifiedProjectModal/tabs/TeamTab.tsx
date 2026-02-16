import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

export default function TeamTab({ project, formData, setFormData, editMode, readOnly, typeConfig }: UnifiedTabProps) {
  const isEditing = editMode && !readOnly;

  // For content source, show the existing team assignments
  if (project.source === 'content') {
    const members = [
      { role: 'Creador', name: project.contentData?.creator?.full_name, id: formData.creator_id },
      { role: 'Editor', name: project.contentData?.editor?.full_name, id: formData.editor_id },
      { role: 'Estratega', name: project.contentData?.strategist?.full_name, id: formData.strategist_id },
    ].filter(m => m.name || m.id);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo
        </h3>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay miembros asignados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m, i) => (
              <div key={i} className="border rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(m.name || '?')[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{m.name || 'Sin asignar'}</p>
                  <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Marketplace source
  const members = [
    { role: 'Marca', name: project.clientName },
    { role: 'Creador', name: project.creatorName },
    { role: 'Editor', name: project.editorName },
  ].filter(m => m.name);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Equipo del Proyecto
      </h3>

      <div className="text-sm text-muted-foreground mb-4">
        Tipo: <Badge variant="secondary" className="text-xs ml-1">{typeConfig.label}</Badge>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay participantes asignados</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m, i) => (
            <div key={i} className="border rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(m.name || '?')[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{m.name}</p>
                <Badge variant="secondary" className="text-xs">{m.role}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roles for this project type */}
      <div className="border-t pt-4 space-y-3">
        {typeConfig.roles.primary.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Roles principales</h4>
            <div className="flex flex-wrap gap-1">
              {typeConfig.roles.primary.slice(0, 8).map(role => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role.replace(/_/g, ' ')}
                </Badge>
              ))}
              {typeConfig.roles.primary.length > 8 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{typeConfig.roles.primary.length - 8} mas
                </Badge>
              )}
            </div>
          </div>
        )}
        {typeConfig.roles.support.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Soporte</h4>
            <div className="flex flex-wrap gap-1">
              {typeConfig.roles.support.map(role => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {typeConfig.roles.reviewer.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Revisores</h4>
            <div className="flex flex-wrap gap-1">
              {typeConfig.roles.reviewer.map(role => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
