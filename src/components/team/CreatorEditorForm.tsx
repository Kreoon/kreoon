import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, MapPin, Instagram, Facebook, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido"),
  address: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  is_ambassador: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreatorEditorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    document_type?: string | null;
    document_number?: string | null;
    city?: string | null;
    address?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    is_ambassador?: boolean | null;
  } | null;
  onSuccess?: () => void;
}

export function CreatorEditorForm({ open, onOpenChange, profile, onSuccess }: CreatorEditorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!profile;
  const { currentOrgId } = useOrgOwner();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      document_type: "",
      document_number: "",
      city: "",
      phone: "",
      email: "",
      address: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      is_ambassador: false,
    },
  });

  // Reset form when profile changes
  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        document_type: profile.document_type || "",
        document_number: profile.document_number || "",
        city: profile.city || "",
        phone: profile.phone || "",
        email: profile.email || "",
        address: profile.address || "",
        instagram: profile.instagram || "",
        facebook: profile.facebook || "",
        tiktok: profile.tiktok || "",
        is_ambassador: profile.is_ambassador ?? false,
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: FormData) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "No se puede actualizar sin un perfil válido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newIsAmbassador = !!data.is_ambassador;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          document_type: data.document_type || null,
          document_number: data.document_number || null,
          city: data.city || null,
          phone: data.phone || null,
          address: data.address || null,
          instagram: data.instagram || null,
          facebook: data.facebook || null,
          tiktok: data.tiktok || null,
          is_ambassador: newIsAmbassador,
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Keep ambassador badge system in sync (source of truth for internal brand assignments)
      if (currentOrgId) {
        if (newIsAmbassador) {
          const { error: badgeError } = await supabase
            .from('organization_member_badges')
            .upsert(
              {
                organization_id: currentOrgId,
                user_id: profile.id,
                badge: 'ambassador',
                level: 'bronze',
                is_active: true,
                granted_at: new Date().toISOString(),
                granted_by: user?.id || null,
              },
              { onConflict: 'organization_id,user_id,badge' }
            );
          if (badgeError) throw badgeError;
        } else {
          const { error: badgeError } = await supabase
            .from('organization_member_badges')
            .update({
              is_active: false,
              revoked_at: new Date().toISOString(),
              revoked_by: user?.id || null,
            })
            .eq('organization_id', currentOrgId)
            .eq('user_id', profile.id)
            .eq('badge', 'ambassador');
          if (badgeError) throw badgeError;
        }
      }

      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "Editar Perfil" : "Nuevo Creador/Editor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Documento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cc">Cédula de Ciudadanía</SelectItem>
                        <SelectItem value="ce">Cédula de Extranjería</SelectItem>
                        <SelectItem value="passport">Pasaporte</SelectItem>
                        <SelectItem value="nit">NIT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de documento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ciudad */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      WhatsApp / Teléfono
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="+57 300 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email de Contacto *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="email@ejemplo.com" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dirección */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Dirección
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección completa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado de Embajador */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <FormField
                control={form.control}
                name="is_ambassador"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base">
                        <Star className="h-4 w-4 text-primary" />
                        Embajador Creartor Studio
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Los embajadores reciben contenido exclusivo de la marca
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Redes Sociales */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Redes Sociales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="@usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="usuario o URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                        TikTok
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="@usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
