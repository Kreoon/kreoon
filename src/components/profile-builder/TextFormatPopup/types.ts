export interface TextFormatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel?: () => void;
  title?: string;
  placeholder?: string;
  /**
   * inline: Editor pequeño con formato HTML
   * block: Editor grande con formato HTML
   * plain: Editor pequeño sin formato (solo texto plano)
   */
  mode?: 'inline' | 'block' | 'plain';
}

export interface UseTextFormatPopupReturn {
  isOpen: boolean;
  editingField: string | null;
  editingContent: string;
  openEditor: (field: string, currentContent: string) => void;
  closeEditor: () => void;
}
