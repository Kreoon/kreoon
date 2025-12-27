import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ChatAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const BUCKET_NAME = 'chat-attachments';

const getFileType = (mimeType: string): ChatAttachment['type'] => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};

export function useChatAttachments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadAttachment = useCallback(async (
    file: File,
    conversationId: string,
    messageId?: string
  ): Promise<ChatAttachment | null> => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no puede superar 200MB',
        variant: 'destructive'
      });
      return null;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión para subir archivos',
        variant: 'destructive'
      });
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Use user_id as folder for RLS policy compliance
      const filePath = `${user.id}/${conversationId}/${fileName}`;

      setUploadProgress(10);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
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

      setUploadProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Track attachment metadata for auto-cleanup after 8 days
      await supabase.from('chat_attachment_metadata').insert({
        storage_path: filePath,
        message_id: messageId || null,
        uploaded_by: user.id,
        file_size: file.size,
        file_type: file.type,
        expires_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
      });

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
        description: 'No se pudo subir el archivo. Intenta de nuevo.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [toast, user?.id]);

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
    formatFileSize,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeFormatted: '200MB'
  };
}
