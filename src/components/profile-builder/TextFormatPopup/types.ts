export interface TextFormatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel?: () => void;
  title?: string;
  placeholder?: string;
  mode?: 'inline' | 'block';
}

export interface UseTextFormatPopupReturn {
  isOpen: boolean;
  editingField: string | null;
  editingContent: string;
  openEditor: (field: string, currentContent: string) => void;
  closeEditor: () => void;
}
