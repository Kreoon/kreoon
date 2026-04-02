import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, File, ExternalLink, Trash2, Loader2, 
  FileText, Link2, CheckCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductDocumentUploaderProps {
  label: string;
  icon?: React.ReactNode;
  fileUrl: string;
  driveUrl: string;
  productId?: string;
  productName?: string;
  documentType: 'brief' | 'onboarding' | 'research';
  onFileUrlChange: (url: string) => void;
  onDriveUrlChange: (url: string) => void;
  disabled?: boolean;
}

export function ProductDocumentUploader({
  label,
  icon,
  fileUrl,
  driveUrl,
  productId,
  productName,
  documentType,
  onFileUrlChange,
  onDriveUrlChange,
  disabled = false,
}: ProductDocumentUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showDriveInput, setShowDriveInput] = useState(!fileUrl && !!driveUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede superar los 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const safeName = productName?.replace(/[^a-zA-Z0-9]/g, '_') || 'product';
      const fileName = `${safeName}_${documentType}_${timestamp}.${fileExt}`;
      const filePath = productId 
        ? `${productId}/${fileName}` 
        : `temp/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-documents')
        .getPublicUrl(data.path);

      onFileUrlChange(urlData.publicUrl);
      
      toast({
        title: "Documento cargado",
        description: "El archivo se ha subido correctamente"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir",
        description: "No se pudo cargar el documento",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async () => {
    if (!fileUrl) return;
    
    try {
      // Extract path from URL
      const urlParts = fileUrl.split('/product-documents/');
      if (urlParts[1]) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage
          .from('product-documents')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
    
    onFileUrlChange('');
  };

  const hasFile = !!fileUrl;
  const hasDrive = !!driveUrl;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        {icon || <FileText className="h-4 w-4" />} {label}
      </Label>
      
      <div className="space-y-2">
        {/* File upload area */}
        {!hasFile ? (
          <div className="border-2 border-dashed rounded-sm p-4 transition-colors hover:border-primary/50">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
              disabled={disabled || uploading}
            />
            
            <div className="flex flex-col items-center gap-2 text-center">
              {uploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Subiendo documento...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled}
                    >
                      Subir archivo
                    </Button>
                    <span className="text-sm text-muted-foreground mx-2">o</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDriveInput(!showDriveInput)}
                      disabled={disabled}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Usar URL
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel, PowerPoint (máx. 10MB)
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-sm border">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Documento cargado</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Ver documento
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Drive URL input */}
        {(showDriveInput || hasDrive) && !hasFile && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">O usa un enlace de Google Drive</span>
            </div>
            <Input
              value={driveUrl}
              onChange={(e) => onDriveUrlChange(e.target.value)}
              placeholder="https://drive.google.com/..."
              type="url"
              disabled={disabled}
              className="text-sm"
            />
          </div>
        )}

        {/* Show drive link if both exist */}
        {hasFile && hasDrive && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            También tiene URL de Drive: 
            <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
              {driveUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
