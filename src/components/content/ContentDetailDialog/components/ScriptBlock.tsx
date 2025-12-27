import React, { useState } from 'react';
import { RichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { SectionCard } from './SectionCard';
import { PermissionsGate, EditableField } from './PermissionsGate';
import { ContentFormData, ContentPermissions, ScriptBlockConfig } from '../types';
import { Maximize2, MessageSquare } from 'lucide-react';

interface ScriptBlockProps {
  config: ScriptBlockConfig;
  formData: ContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  editMode: boolean;
  permissions: ContentPermissions;
  onTeleprompter?: (content: string) => void;
  onComment?: (blockKey: string) => void;
  commentsCount?: number;
}

/**
 * ScriptBlock - Individual script block for a specific role
 * Renders with edit/view mode based on RBAC permissions
 */
export function ScriptBlock({
  config,
  formData,
  setFormData,
  editMode,
  permissions,
  onTeleprompter,
  onComment,
  commentsCount = 0,
}: ScriptBlockProps) {
  const { key, icon, title, fieldKey, placeholder, resourceKey } = config;
  const value = formData[fieldKey] as string || '';
  const canEdit = permissions.can(resourceKey, 'edit');
  const hasContent = value.trim().length > 0;

  const handleChange = (newValue: string) => {
    setFormData(prev => ({ ...prev, [fieldKey]: newValue }));
  };

  return (
    <PermissionsGate
      permissions={permissions}
      resource={resourceKey}
      action="view"
    >
      <SectionCard
        title={title}
        iconEmoji={icon}
        variant={hasContent ? 'default' : 'compact'}
        headerAction={
          <div className="flex items-center gap-1">
            {hasContent && onTeleprompter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onTeleprompter(value)}
                title="Teleprompter"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onComment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 relative"
                onClick={() => onComment(key)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {commentsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {commentsCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        }
      >
        <EditableField
          permissions={permissions}
          resource={resourceKey}
          editMode={editMode}
          editComponent={
            <div className="max-h-[300px] overflow-y-auto">
              <RichTextEditor
                content={value}
                onChange={handleChange}
                placeholder={placeholder}
              />
            </div>
          }
          viewComponent={
            hasContent ? (
              <div className="max-h-[250px] overflow-y-auto prose prose-sm dark:prose-invert">
                <RichTextViewer content={value} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sin contenido
              </p>
            )
          }
        />
      </SectionCard>
    </PermissionsGate>
  );
}

/**
 * ScriptBlocksContainer - Renders all script blocks with scroll
 */
interface ScriptBlocksContainerProps {
  blocks: ScriptBlockConfig[];
  formData: ContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  editMode: boolean;
  permissions: ContentPermissions;
  onTeleprompter?: (content: string) => void;
  onComment?: (blockKey: string) => void;
  commentsCounts?: Record<string, number>;
}

export function ScriptBlocksContainer({
  blocks,
  formData,
  setFormData,
  editMode,
  permissions,
  onTeleprompter,
  onComment,
  commentsCounts = {},
}: ScriptBlocksContainerProps) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {blocks.map(block => (
        <ScriptBlock
          key={block.key}
          config={block}
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          permissions={permissions}
          onTeleprompter={onTeleprompter}
          onComment={onComment}
          commentsCount={commentsCounts[block.key]}
        />
      ))}
    </div>
  );
}
