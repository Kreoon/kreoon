import { useState, useCallback } from 'react';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ChatAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
  expiresAt?: string;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

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
      setUploadProgress(10);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session token');
      }

      setUploadProgress(20);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to Bunny via edge function
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-chat-upload?conversation_id=${conversationId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setUploadProgress(90);

      // Update metadata with message ID if provided
      if (messageId && result.storage_path) {
        await supabase
          .from('chat_attachment_metadata')
          .update({ message_id: messageId })
          .eq('storage_path', result.storage_path);
      }

      setUploadProgress(100);

      return {
        url: result.url,
        name: result.name || file.name,
        type: getFileType(file.type),
        size: file.size,
        expiresAt: result.expires_at
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: 'Error al subir archivo',
        description: error instanceof Error ? error.message : 'No se pudo subir el archivo. Intenta de nuevo.',
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
