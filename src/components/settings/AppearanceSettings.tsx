import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Palette, Image, Loader2, Save, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppearanceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [settings, setSettings] = useState({
    platform_name: "UGC Colombia",
    logo_url: "",
    favicon_url: "",
    primary_color: "#F5A623"
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["platform_name", "logo_url", "favicon_url", "primary_color"]);

      if (error) throw error;

      const newSettings = { ...settings };
      data?.forEach((item) => {
        if (item.key in newSettings) {
          (newSettings as any)[item.key] = item.value;
        }
      });
      setSettings(newSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      setSettings(prev => ({
        ...prev,
        [type === "logo" ? "logo_url" : "favicon_url"]: publicUrl
      }));

      toast.success(`${type === "logo" ? "Logo" : "Favicon"} subido correctamente`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Error al subir archivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || "",
        description: getDescription(key),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Configuración de apariencia guardada");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      platform_name: "Nombre de la plataforma",
      logo_url: "URL del logo de la plataforma",
      favicon_url: "URL del favicon",
      primary_color: "Color primario de la marca"
    };
    return descriptions[key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Apariencia</h2>
        <p className="text-sm text-muted-foreground">
          Personaliza la identidad visual de tu plataforma
        </p>
      </div>

      {/* Platform Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Nombre de la Plataforma
          </CardTitle>
          <CardDescription>
            El nombre que aparece en el título y encabezados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={settings.platform_name}
            onChange={(e) => setSettings(prev => ({ ...prev, platform_name: e.target.value }))}
            placeholder="Nombre de tu plataforma"
          />
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Logo
          </CardTitle>
          <CardDescription>
            Logo principal de la plataforma (recomendado: PNG transparente, mínimo 200x200px)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={settings.logo_url} className="object-contain" />
              <AvatarFallback className="rounded-lg bg-muted">
                <Image className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Input
                value={settings.logo_url}
                onChange={(e) => setSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://ejemplo.com/logo.png"
              />
              <div className="flex gap-2">
                <Label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Subir imagen
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Favicon
          </CardTitle>
          <CardDescription>
            Icono pequeño que aparece en la pestaña del navegador (recomendado: ICO o PNG 32x32px)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg border border-border flex items-center justify-center bg-muted">
              {settings.favicon_url ? (
                <img src={settings.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
              ) : (
                <Image className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={settings.favicon_url}
                onChange={(e) => setSettings(prev => ({ ...prev, favicon_url: e.target.value }))}
                placeholder="https://ejemplo.com/favicon.ico"
              />
              <div className="flex gap-2">
                <Label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "favicon")}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Subir imagen
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Color Primario
          </CardTitle>
          <CardDescription>
            Color principal de la marca (botones, enlaces, acentos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={settings.primary_color}
              onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
              className="h-10 w-14 rounded border border-border cursor-pointer"
            />
            <Input
              value={settings.primary_color}
              onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
              placeholder="#F5A623"
              className="max-w-32"
            />
            <div 
              className="h-10 flex-1 rounded-lg"
              style={{ backgroundColor: settings.primary_color }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Info Note */}
      <div className="p-4 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Nota:</p>
        <p>
          Los cambios de logo y favicon se aplicarán automáticamente en toda la plataforma. 
          Para ver los cambios del favicon, puede ser necesario refrescar la página o limpiar la caché del navegador.
        </p>
      </div>
    </div>
  );
}
