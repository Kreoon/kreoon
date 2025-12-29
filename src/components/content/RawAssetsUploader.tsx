import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Upload, 
  X, 
  Download, 
  Trash2, 
  FileVideo, 
  FileAudio, 
  File, 
  Loader2,
  Edit2,
  Check,
  FolderDown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface FileToUpload {
  id: string;
  file: File;
  customName: string;
  originalName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

interface UploadedAsset {
  id: string;
  original_filename: string;
  custom_filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string;
  uploader_name?: string;
}

interface RawAssetsUploaderProps {
  contentId: string;
  organizationId: string;
  clientId?: string;
  disabled?: boolean;
  canUpload?: boolean;
  canDelete?: boolean;
}

const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(fileType)) {
    return <FileVideo className="h-5 w-5 text-blue-500" />;
  }
  if (fileType.includes('audio') || ['mp3', 'wav', 'aac', 'flac', 'ogg'].includes(fileType)) {
    return <FileAudio className="h-5 w-5 text-purple-500" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function RawAssetsUploader({
  contentId,
  organizationId,
  clientId,
  disabled = false,
  canUpload = true,
  canDelete = true
}: RawAssetsUploaderProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch existing assets
  const fetchAssets = useCallback(async () => {
    if (!contentId) return;
    
    setLoadingAssets(true);
    try {
      const { data, error } = await supabase
        .from('project_raw_assets')
        .select(`
          id,
          original_filename,
          custom_filename,
          storage_path,
          file_type,
          file_size,
          created_at,
          uploaded_by
        `)
        .eq('project_id', contentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch uploader names - use full_name column
      const uploaderIds = [...new Set(data?.map(a => a.uploaded_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uploaderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Usuario']));

      setUploadedAssets((data || []).map(asset => ({
        ...asset,
        uploader_name: profileMap.get(asset.uploaded_by) || 'Usuario'
      })));
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error al cargar los archivos');
    } finally {
      setLoadingAssets(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: FileToUpload[] = Array.from(files).map(file => {
      const ext = getFileExtension(file.name);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      
      return {
        id: crypto.randomUUID(),
        file,
        customName: baseName,
        originalName: file.name,
        status: 'pending' as const,
        progress: 0
      };
    });

    setFilesToUpload(prev => [...prev, ...newFiles]);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Update custom name for a file
  const updateCustomName = (fileId: string, newName: string) => {
    setFilesToUpload(prev => 
      prev.map(f => f.id === fileId ? { ...f, customName: newName } : f)
    );
  };

  // Remove file from upload queue
  const removeFromQueue = (fileId: string) => {
    setFilesToUpload(prev => prev.filter(f => f.id !== fileId));
  };

  // Validate files before upload
  const validateFiles = (): boolean => {
    const names = filesToUpload.map(f => `${f.customName}.${getFileExtension(f.originalName)}`);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      toast.error(`Nombres duplicados: ${duplicates.join(', ')}`);
      return false;
    }

    const emptyNames = filesToUpload.filter(f => !f.customName.trim());
    if (emptyNames.length > 0) {
      toast.error('Todos los archivos deben tener un nombre');
      return false;
    }

    // Check for duplicates with existing assets
    const existingNames = uploadedAssets.map(a => a.custom_filename);
    const conflictingNames = names.filter(n => existingNames.includes(n));
    if (conflictingNames.length > 0) {
      toast.error(`Archivos ya existentes: ${conflictingNames.join(', ')}`);
      return false;
    }

    return true;
  };

  // Upload files to Bunny Storage using FormData (streaming)
  const handleUpload = async () => {
    if (!validateFiles()) return;
    if (!user?.id) {
      toast.error('Debes iniciar sesión para subir archivos');
      return;
    }

    setIsUploading(true);

    for (const fileToUpload of filesToUpload) {
      if (fileToUpload.status !== 'pending') continue;

      const ext = getFileExtension(fileToUpload.originalName);
      const customFilename = `${fileToUpload.customName}.${ext}`;
      const storagePath = `raw-assets/org_${organizationId}/client_${clientId || 'none'}/project_${contentId}/raw/${customFilename}`;

      try {
        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' as const, progress: 10 } : f)
        );

        // Get session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No autenticado');

        // Progress simulation
        const progressInterval = setInterval(() => {
          setFilesToUpload(prev =>
            prev.map(f => f.id === fileToUpload.id && f.progress < 80 
              ? { ...f, progress: f.progress + 5 } 
              : f
            )
          );
        }, 800);

        // Use FormData for streaming upload (avoids memory issues with large files)
        const formData = new FormData();
        formData.append('file', fileToUpload.file);
        formData.append('storagePath', storagePath);
        formData.append('contentType', fileToUpload.file.type);

        // Get Supabase URL from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/bunny-raw-upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data?.success) throw new Error(data?.error || 'Error de subida');

        // Save to database
        const { error: dbError } = await supabase
          .from('project_raw_assets')
          .insert({
            organization_id: organizationId,
            project_id: contentId,
            uploaded_by: user.id,
            original_filename: fileToUpload.originalName,
            custom_filename: customFilename,
            storage_path: data.url || storagePath,
            file_type: ext,
            file_size: fileToUpload.file.size
          });

        if (dbError) throw dbError;

        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'success' as const, progress: 100 } : f)
        );

      } catch (error: any) {
        console.error('Upload error:', error);
        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { 
            ...f, 
            status: 'error' as const, 
            errorMessage: error.message || 'Error de subida'
          } : f)
        );
      }
    }

    setIsUploading(false);
    
    // Refresh assets list
    await fetchAssets();
    
    // Clear successful uploads
    setFilesToUpload(prev => prev.filter(f => f.status !== 'success'));
    
    const successCount = filesToUpload.filter(f => f.status === 'pending').length;
    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s) correctamente`);
    }
  };

  // Normalize Bunny URLs: convert storage URLs to public CDN URLs
  // Uses the configured CDN hostname
  const CDN_HOSTNAME = 'cdn.kreoon.com'; // Your Bunny CDN hostname
  
  const toPublicAssetUrl = useCallback((url: string) => {
    try {
      const u = new URL(url);
      // Bunny Storage URL: https://<region>.storage.bunnycdn.com/<zone>/<path...>
      if (u.hostname.includes('storage.bunnycdn.com')) {
        const parts = u.pathname.replace(/^\//, '').split('/');
        // Skip the first segment (storage zone name) and get the rest of the path
        const rest = parts.slice(1).join('/');
        if (rest) return `https://${CDN_HOSTNAME}/${rest}`;
      }
      // Already a b-cdn.net URL, normalize to use our hostname
      if (u.hostname.includes('b-cdn.net')) {
        return `https://${CDN_HOSTNAME}${u.pathname}`;
      }
      return url;
    } catch {
      return url;
    }
  }, []);

  const triggerBrowserDownload = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  // Download individual file
  const handleDownload = (asset: UploadedAsset) => {
    const url = toPublicAssetUrl(asset.storage_path);
    triggerBrowserDownload(url, asset.custom_filename);
  };

  // Download all files (one by one, started together)
  const handleDownloadAllFiles = async () => {
    if (uploadedAssets.length === 0) {
      toast.error('No hay archivos para descargar');
      return;
    }

    // Browsers may block too many simultaneous downloads; stagger them slightly.
    uploadedAssets.forEach((asset, idx) => {
      const url = toPublicAssetUrl(asset.storage_path);
      window.setTimeout(() => triggerBrowserDownload(url, asset.custom_filename), idx * 450);
    });

    toast.success('Descargas iniciadas');
  };

  // Download all as ZIP
  const handleDownloadZip = async () => {
    if (uploadedAssets.length === 0) {
      toast.error('No hay archivos para descargar');
      return;
    }

    setDownloadingZip(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-raw-zip', {
        body: {
          projectId: contentId,
          assets: uploadedAssets.map(a => ({
            // Prefer public CDN URLs to avoid storage auth issues
            url: toPublicAssetUrl(a.storage_path),
            filename: a.custom_filename,
          })),
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No se pudo generar el ZIP');

      // Download ZIP
      window.open(data.url, '_blank');
      toast.success('Descarga iniciada');
    } catch (error: any) {
      console.error('ZIP error:', error);
      toast.error('Error al generar el ZIP: ' + (error.message || 'Error desconocido'));
    } finally {
      setDownloadingZip(false);
    }
  };

  // Delete asset
  const handleDelete = async (assetId: string) => {
    setDeletingId(assetId);
    try {
      const asset = uploadedAssets.find(a => a.id === assetId);
      if (!asset) throw new Error('Archivo no encontrado');

      // Delete from Bunny Storage
      await supabase.functions.invoke('bunny-raw-delete', {
        body: { storagePath: asset.storage_path }
      });

      // Delete from database
      const { error } = await supabase
        .from('project_raw_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      setUploadedAssets(prev => prev.filter(a => a.id !== assetId));
      toast.success('Archivo eliminado');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar: ' + (error.message || 'Error desconocido'));
    } finally {
      setDeletingId(null);
    }
  };

  // Retry failed upload
  const retryUpload = (fileId: string) => {
    setFilesToUpload(prev =>
      prev.map(f => f.id === fileId ? { ...f, status: 'pending' as const, progress: 0, errorMessage: undefined } : f)
    );
  };

  if (!contentId) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          Guarda el proyecto primero para subir material crudo
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {canUpload && !disabled && (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Arrastra archivos aquí o
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
              >
                Seleccionar archivos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  e.stopPropagation();
                  handleFileSelect(e.target.files);
                  // Reset input value to allow selecting the same file again
                  e.target.value = '';
                }}
                accept="video/*,audio/*,.mov,.mp4,.avi,.mkv,.webm,.wav,.mp3,.aac,.flac"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Videos y audio: MP4, MOV, AVI, MKV, WEBM, WAV, MP3, AAC, FLAC
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files to Upload Queue */}
      {filesToUpload.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Archivos para subir ({filesToUpload.length})</span>
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpload();
                }} 
                disabled={isUploading || filesToUpload.every(f => f.status !== 'pending')}
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Guardar archivos
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {filesToUpload.map((file) => (
                  <div 
                    key={file.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      file.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                      file.status === 'success' ? 'border-success/50 bg-success/5' :
                      'border-border bg-muted/30'
                    }`}
                  >
                    {getFileIcon(getFileExtension(file.originalName))}
                    
                    <div className="flex-1 min-w-0">
                      {file.status === 'pending' ? (
                        <Input
                          value={file.customName}
                          onChange={(e) => updateCustomName(file.id, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nombre del archivo..."
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">
                          {file.customName}.{getFileExtension(file.originalName)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        Original: {file.originalName} • {formatFileSize(file.file.size)}
                      </p>
                      
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-2" />
                      )}
                      
                      {file.status === 'error' && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {file.errorMessage}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {file.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => retryUpload(file.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === 'success' && (
                        <Check className="h-5 w-5 text-success" />
                      )}
                      {file.status !== 'uploading' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromQueue(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Assets List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-3">
            <span>Material Crudo ({uploadedAssets.length})</span>
            {uploadedAssets.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAllFiles}
                >
                  <FolderDown className="h-4 w-4 mr-2" />
                  Descargar archivos
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando ZIP...
                    </>
                  ) : (
                    <>
                      <FolderDown className="h-4 w-4 mr-2" />
                      Descargar ZIP
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAssets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : uploadedAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay material crudo</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {uploadedAssets.map((asset) => (
                  <div 
                    key={asset.id} 
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {getFileIcon(asset.file_type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.custom_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.file_size)} • Subido por {asset.uploader_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {asset.file_type.toUpperCase()}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(asset)}
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(asset.id)}
                          disabled={deletingId === asset.id}
                          title="Eliminar"
                        >
                          {deletingId === asset.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
