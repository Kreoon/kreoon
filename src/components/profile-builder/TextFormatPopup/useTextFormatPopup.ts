import { useState, useCallback } from 'react';
import { UseTextFormatPopupReturn } from './types';

export function useTextFormatPopup(): UseTextFormatPopupReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const openEditor = useCallback((field: string, currentContent: string) => {
    setEditingField(field);
    setEditingContent(currentContent);
    setIsOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsOpen(false);
    setEditingField(null);
    setEditingContent('');
  }, []);

  return {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  };
}
