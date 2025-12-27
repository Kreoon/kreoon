import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const getFileType = (mimeType: string): ChatAttachment['type'] => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};

export function useChatAttachments() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadAttachment = useCallback(async (
    file: File,
    conversationId: string
  ): Promise<ChatAttachment | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 25MB',
        variant: 'destructive'
      });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat-attachments/${conversationId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // If bucket doesn't exist, show message
        if (error.message.includes('Bucket not found')) {
          toast({
            title: 'Error',
            description: 'El almacenamiento de archivos no está configurado',
            variant: 'destructive'
          });
          return null;
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      return {
        url: publicUrl,
        type: getFileType(file.type),
        name: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: 'Error al subir archivo',
        description: 'No se pudo subir el archivo',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    uploadAttachment,
    uploading,
    uploadProgress,
    formatFileSize
  };
}
