import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Upload, 
  X, 
  Trash2, 
  FileVideo, 
  FileAudio, 
  File, 
  Loader2,
  Edit2,
  Check,
  FolderDown,
  AlertCircle,
  RefreshCw,
  Download
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  // Upload files directly to Bunny Storage (bypasses edge function memory limits)
  const handleUpload = async () => {
    if (!validateFiles()) return;
    if (!user?.id) {
      toast.error('Debes iniciar sesión para subir archivos');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    for (const fileToUpload of filesToUpload) {
      if (fileToUpload.status !== 'pending') continue;

      const ext = getFileExtension(fileToUpload.originalName);
      const customFilename = `${fileToUpload.customName}.${ext}`;
      const storagePath = `org_${organizationId}/client_${clientId || 'none'}/project_${contentId}/raw/${customFilename}`;

      try {
        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' as const, progress: 2 } : f)
        );

        // Get session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No autenticado');

        // Step 1: Get upload credentials from edge function
        const credentialsUrl = `${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-raw-upload?storagePath=${encodeURIComponent(storagePath)}`;
        
        const credResponse = await fetch(credentialsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!credResponse.ok) {
          const errorData = await credResponse.json().catch(() => ({}));
          throw new Error(errorData?.error || `Error ${credResponse.status}`);
        }

        const credentials = await credResponse.json();
        if (!credentials?.success || !credentials?.uploadUrl) {
          throw new Error('No se obtuvieron credenciales');
        }

        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, progress: 5 } : f)
        );

        // Step 2: Upload directly to Bunny Storage using fetch with ReadableStream
        // This works better on mobile than XMLHttpRequest for large files
        const uploadPromise = new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 90) + 5;
              setFilesToUpload(prev =>
                prev.map(f => f.id === fileToUpload.id ? { ...f, progress: percent } : f)
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Bunny error: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Error de conexión'));
          xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado'));
          xhr.onabort = () => reject(new Error('Subida cancelada'));

          // Set timeout for large files (10 min)
          xhr.timeout = 600000;

          xhr.open('PUT', credentials.uploadUrl, true);
          xhr.setRequestHeader('AccessKey', credentials.accessKey);
          xhr.setRequestHeader('Content-Type', fileToUpload.file.type || 'application/octet-stream');
          xhr.send(fileToUpload.file);
        });

        await uploadPromise;

        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, progress: 96 } : f)
        );

        // Step 3: Save to database
        const { error: dbError } = await supabase
          .from('project_raw_assets')
          .insert({
            organization_id: organizationId,
            project_id: contentId,
            uploaded_by: user.id,
            original_filename: fileToUpload.originalName,
            custom_filename: customFilename,
            storage_path: storagePath,
            file_type: ext,
            file_size: fileToUpload.file.size
          });

        if (dbError) throw dbError;

        setFilesToUpload(prev =>
          prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'success' as const, progress: 100 } : f)
        );
        successCount++;

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
    await fetchAssets();
    
    // Clear successful uploads after a short delay
    setTimeout(() => {
      setFilesToUpload(prev => prev.filter(f => f.status !== 'success'));
    }, 1500);
    
    if (successCount > 0) {
      toast.success(`${successCount} archivo(s) subido(s)`);
    }
  };

  // Downloads are done via backend function (authenticated) because the raw-assets storage zone
  // is not publicly accessible via CDN.
  const triggerBlobDownload = useCallback((blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  // Download all as ZIP - downloads the entire project folder from storage
  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      // Build the folder path matching upload structure: org_xxx/client_xxx/project_xxx/raw
      const folderPath = `org_${organizationId}/client_${clientId || 'none'}/project_${contentId}/raw`;
      
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-raw-zip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: contentId,
          folderPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 413 - files too large
        if (response.status === 413) {
          toast.error('Archivos muy grandes. Descarga individualmente.', {
            duration: 5000,
          });
          return;
        }
        
        throw new Error(errorData?.error || `Error HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const zipName = `material_crudo_${String(contentId).slice(0, 8)}.zip`;
      triggerBlobDownload(blob, zipName);
      toast.success('Descarga iniciada');
    } catch (error: any) {
      console.error('ZIP error:', error);
      toast.error('Error al generar el ZIP: ' + (error.message || 'Error desconocido'));
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download individual file
  const handleDownloadFile = async (asset: UploadedAsset) => {
    setDownloadingId(asset.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No autenticado');

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-raw-download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath: asset.storage_path,
          filename: asset.custom_filename,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `Error HTTP ${response.status}`);
      }

      const blob = await response.blob();
      triggerBlobDownload(blob, asset.custom_filename);
      toast.success('Descarga iniciada');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Error al descargar: ' + (error.message || 'Error desconocido'));
    } finally {
      setDownloadingId(null);
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
    <div className="space-y-4">
      {/* Upload Zone - Optimized for mobile */}
      {canUpload && !disabled && (
        <Card className="border-dashed">
          <CardContent className="p-4 sm:p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3 hidden sm:block">
                Arrastra archivos aquí o
              </p>
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
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
                  e.target.value = '';
                }}
                accept="video/*,audio/*,.mov,.mp4,.avi,.mkv,.webm,.wav,.mp3,.aac,.flac"
              />
              <p className="text-xs text-muted-foreground mt-3">
                MP4, MOV, AVI, MKV, WEBM, WAV, MP3, AAC, FLAC
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files to Upload Queue - Mobile optimized */}
      {filesToUpload.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Archivos ({filesToUpload.length})</span>
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpload();
                }} 
                disabled={isUploading || filesToUpload.every(f => f.status !== 'pending')}
                size="sm"
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir archivos
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[250px] sm:max-h-[300px]">
              <div className="space-y-2">
                {filesToUpload.map((file) => (
                  <div 
                    key={file.id} 
                    className={`flex items-start gap-2 p-2 sm:p-3 rounded-lg border ${
                      file.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                      file.status === 'success' ? 'border-green-500/50 bg-green-500/5' :
                      'border-border bg-muted/30'
                    }`}
                  >
                    <div className="pt-1">
                      {getFileIcon(getFileExtension(file.originalName))}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {file.status === 'pending' ? (
                        <Input
                          value={file.customName}
                          onChange={(e) => updateCustomName(file.id, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nombre..."
                        />
                      ) : (
                        <p className="text-sm font-medium truncate">
                          {file.customName}.{getFileExtension(file.originalName)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {formatFileSize(file.file.size)}
                      </p>
                      
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{file.progress}%</p>
                        </div>
                      )}
                      
                      {file.status === 'error' && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{file.errorMessage}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        <Check className="h-5 w-5 text-green-500" />
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

      {/* Uploaded Assets List - Mobile optimized */}
      <Card>
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Material Crudo ({uploadedAssets.length})</span>
            {uploadedAssets.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="w-full sm:w-auto"
              >
                {downloadingZip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FolderDown className="h-4 w-4 mr-2" />
                    Descargar ZIP
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loadingAssets ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : uploadedAssets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay material crudo</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px] sm:max-h-[400px]">
              <div className="space-y-2">
                {uploadedAssets.map((asset) => (
                  <div 
                    key={asset.id} 
                    className="flex items-start gap-2 p-2 sm:p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="pt-0.5">
                      {getFileIcon(asset.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.custom_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(asset.file_size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {asset.file_type.toUpperCase()}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleDownloadFile(asset)}
                        disabled={downloadingId === asset.id}
                        title="Descargar archivo"
                      >
                        {downloadingId === asset.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(asset.id)}
                          disabled={deletingId === asset.id}
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
