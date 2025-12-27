import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { RichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { ScriptViewer } from '@/components/content/ScriptViewer';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Maximize2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScriptBlockConfig, ContentFormData } from '../types';

interface RoleBlockProps {
  config: ScriptBlockConfig;
  content: string;
  onChange?: (value: string) => void;
  isEditing: boolean;
  canEdit: boolean;
  className?: string;
  defaultOpen?: boolean;
  showTeleprompter?: boolean;
}

export function RoleBlock({
  config,
  content,
  onChange,
  isEditing,
  canEdit,
  className,
  defaultOpen = true,
  showTeleprompter = false,
}: RoleBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (!content) return;
    
    // Strip HTML tags for plain text copy
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast({ title: 'Copiado al portapapeles' });
    setTimeout(() => setCopied(false), 2000);
  };

  const hasContent = !!content?.trim();
  const isScriptBlock = config.key === 'creador';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.icon}</span>
              <h4 className={cn('font-medium', config.color)}>{config.title}</h4>
              {!hasContent && (
                <span className="text-xs text-muted-foreground italic">(vacío)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-3 pt-0 border-t">
            {isEditing && canEdit ? (
              <RichTextEditor
                content={content || ''}
                onChange={onChange || (() => {})}
                placeholder={config.placeholder}
                className="min-h-[200px]"
              />
            ) : hasContent ? (
              <div className="max-h-[400px] overflow-y-auto">
                {isScriptBlock ? (
                  <ScriptViewer content={content} maxHeight="max-h-[400px]" />
                ) : (
                  <RichTextViewer content={content} className="min-h-[100px]" />
                )}
              </div>
            ) : (
              <div className="min-h-[100px] rounded-md border bg-muted/30 flex items-center justify-center">
                <p className="text-sm text-muted-foreground italic">
                  Sin contenido disponible
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface RoleBlocksContainerProps {
  blocks: ScriptBlockConfig[];
  formData: ContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  editMode: boolean;
  canEdit: boolean;
  visibleBlocks?: string[];
}

export function RoleBlocksContainer({
  blocks,
  formData,
  setFormData,
  editMode,
  canEdit,
  visibleBlocks,
}: RoleBlocksContainerProps) {
  const filteredBlocks = visibleBlocks 
    ? blocks.filter(b => visibleBlocks.includes(b.key))
    : blocks;

  return (
    <div className="space-y-3">
      {filteredBlocks.map((block, index) => (
        <RoleBlock
          key={block.key}
          config={block}
          content={formData[block.fieldKey] as string}
          onChange={(value) => setFormData(prev => ({ ...prev, [block.fieldKey]: value }))}
          isEditing={editMode}
          canEdit={canEdit}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
