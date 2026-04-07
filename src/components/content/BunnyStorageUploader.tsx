import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase, SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Download, FileVideo, X, Plus, FolderDown, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UploadedFile {
  name: string;
  url: string;
  size: number;
}

interface BunnyStorageUploaderProps {
  contentId: string;
  fileType: 'raw_video' | 'thumbnail';
  currentUrls?: string[] | null;
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  showDownload?: boolean;
  multiple?: boolean;
}

export function BunnyStorageUploader({ 
  contentId, 
  fileType,
  currentUrls = [],
  onUploadComplete,
  disabled,
  accept = "video/mp4,video/webm,video/quicktime,video/x-msvideo",
  label = "Subir archivo",
  showDownload = false,
  multiple,
}: BunnyStorageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    (currentUrls || []).filter(Boolean).map(url => ({
      name: url.split('/').pop() || 'archivo',
      url,
      size: 0
    }))
  );
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync uploadedFiles when currentUrls changes (e.g., on dialog open/data reload)
  useEffect(() => {
    const newFiles = (currentUrls || []).filter(Boolean).map(url => ({
      name: url.split('/').pop() || 'archivo',
      url,
      size: 0
    }));
    setUploadedFiles(newFiles);
  }, [currentUrls]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file sizes (max 5GB each)
    const maxSize = 5 * 1024 * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} supera los 5GB permitidos`,
          variant: "destructive"
        });
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);

    const newUploadedFiles: UploadedFile[] = [...uploadedFiles];

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData.session?.user?.id || 'anonymous';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i + 1);
        setProgress(0);

        try {
          // === Step 1: Create video entry in Bunny (lightweight JSON call) ===
          const createRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              user_id: userId,
              type: fileType,
              file_name: file.name,
            }),
          });

          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            throw new Error(errData.error || `Error del servidor: ${createRes.status}`);
          }

          const createData = await createRes.json();
          if (!createData.success) {
            throw new Error(createData.error || 'Error al crear video en Bunny');
          }

          // === Step 2: Upload file DIRECTLY to Bunny (XHR with real progress) ===
          const embedUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 90);
                setProgress(percentComplete);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(createData.embed_url);
              } else {
                reject(new Error(`Error subiendo a Bunny: ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              console.error('[BunnyStorageUploader] XHR error:', { readyState: xhr.readyState, status: xhr.status });
              reject(new Error(`Error de conexión (estado: ${xhr.readyState}). Verifica tu internet y desactiva VPN/bloqueadores.`));
            });
            xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));
            xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado (10 min). Verifica tu conexión.')));

            xhr.open('PUT', createData.upload_url);
            xhr.setRequestHeader('AccessKey', createData.access_key);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.timeout = 600000; // 10 minutes for large files
            xhr.send(file);
          });

          // === Step 3: Save URL to database via edge function ===
          await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/bunny-portfolio-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save-raw-video',
              content_id: contentId,
              embed_url: embedUrl,
            }),
          });

          setProgress(100);

          newUploadedFiles.push({
            name: file.name,
            url: embedUrl,
            size: file.size
          });

        } catch (error) {
          console.error('Upload error for file:', file.name, error);
          toast({
            title: "Error al subir",
            description: `${file.name}: ${error instanceof Error ? error.message : "No se pudo subir el archivo"}`,
            variant: "destructive"
          });
        }
      }

      setUploadedFiles(newUploadedFiles);
      onUploadComplete?.(newUploadedFiles.map(f => f.url));

      if (newUploadedFiles.length > uploadedFiles.length) {
        toast({
          title: "Archivos subidos",
          description: `${newUploadedFiles.length - uploadedFiles.length} archivo(s) subido(s) correctamente`
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setCurrentFileIndex(0);
      setTotalFiles(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete?.(newFiles.map(f => f.url));
  };

  const handleDownload = async (url: string, index: number) => {
    setDownloadingIndex(index);
    
    try {
      // Use bunny-download edge function to get proper download URL
      const { data, error } = await supabase.functions.invoke('bunny-download', {
        body: { content_id: contentId, video_url: url }
      });

      if (error) throw error;

      if (data?.download_url) {
        // Open download URL in new tab
        window.open(data.download_url, '_blank');
      } else {
        // Fallback: open the URL directly
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open URL directly
      window.open(url, '_blank');
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    if (uploadedFiles.length === 0) return;
    
    setDownloadingAll(true);
    toast({
      title: "Descargando archivos",
      description: `Iniciando descarga de ${uploadedFiles.length} archivo(s)...`
    });

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        
        try {
          const { data, error } = await supabase.functions.invoke('bunny-download', {
            body: { content_id: contentId, video_url: file.url }
          });

          if (!error && data?.download_url) {
            window.open(data.download_url, '_blank');
          } else {
            window.open(file.url, '_blank');
          }
        } catch {
          window.open(file.url, '_blank');
        }

        // Small delay between downloads to avoid popup blocker
        if (i < uploadedFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Descargas iniciadas",
        description: `${uploadedFiles.length} archivo(s) abiertos en nuevas pestañas`
      });
    } catch (error) {
      console.error('Download all error:', error);
      toast({
        title: "Error",
        description: "No se pudieron descargar todos los archivos",
        variant: "destructive"
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const allowMultiple = multiple ?? true;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
        multiple={allowMultiple}
      />

      {/* Upload Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={uploadedFiles.length > 0 ? 'outline' : 'default'}
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {uploading 
            ? `Subiendo ${currentFileIndex}/${totalFiles}...` 
            : uploadedFiles.length > 0 
              ? 'Agregar más archivos' 
              : label
          }
        </Button>

        {uploadedFiles.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {uploadedFiles.length} archivo(s)
          </Badge>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Subiendo archivo {currentFileIndex} de {totalFiles}... {progress}%
          </p>
        </div>
      )}

      {/* Uploaded Files Notification Style - Collapsible */}
      {uploadedFiles.length > 0 && !uploading && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="rounded-sm border bg-green-500/10 border-green-500/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {uploadedFiles.length} video(s) crudo(s) subido(s)
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-green-600" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              {showDownload && uploadedFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="flex items-center gap-2 border-green-500/30 text-green-700 hover:bg-green-500/10"
                >
                  {downloadingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderDown className="h-4 w-4" />
                  )}
                  Descargar todo
                </Button>
              )}
            </div>
            
            {/* Collapsible file list */}
            <CollapsibleContent>
              <div className="space-y-1 pt-2">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between gap-2 p-1.5 rounded bg-background/50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileVideo className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 shrink-0">
                      {showDownload && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDownload(file.url, index)}
                          disabled={downloadingIndex === index}
                          title="Descargar"
                        >
                          {downloadingIndex === index ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {!disabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveFile(index)}
                          title="Eliminar"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
