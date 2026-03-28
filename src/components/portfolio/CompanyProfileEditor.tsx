import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Camera, Loader2, Save, Building2, Globe, Lock, Instagram, 
  Phone, Mail, MapPin, FileText, User, Linkedin, Facebook as FacebookIcon
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const COMPANY_CATEGORIES = [
  { value: 'productos_digitales', label: 'Productos Digitales' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'perfume', label: 'Perfume' },
  { value: 'vehicular', label: 'Vehicular' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'juguetes', label: 'Juguetes' },
  { value: 'suplementos', label: 'Suplementos' },
  { value: 'belleza', label: 'Belleza' },
  { value: 'cosmeticos', label: 'Cosméticos' },
  { value: 'educacion', label: 'Educación' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'saas', label: 'SaaS' },
  { value: 'otro', label: 'Otro' },
];

const DOCUMENT_TYPES = [
  { value: 'nit', label: 'NIT (Colombia)' },
  { value: 'ein', label: 'EIN (USA)' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'rut', label: 'RUT' },
  { value: 'rfc', label: 'RFC (México)' },
  { value: 'otro', label: 'Otro' },
];

interface CompanyData {
  name: string;
  bio: string | null;
  logo_url: string | null;
  username: string | null;
  is_public: boolean;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  portfolio_url: string | null;
  document_type: string | null;
  document_number: string | null;
  main_contact: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  linkedin: string | null;
  category: string | null;
  profile_completed: boolean;
}

interface CompanyProfileEditorProps {
  companyId: string;
  currentData?: Partial<CompanyData>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function CompanyProfileEditor({
  companyId,
  currentData,
  open,
  onOpenChange,
  onSave,
}: CompanyProfileEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Basic info
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Document
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  
  // Contact
  const [mainContact, setMainContact] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  // Online presence
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  // Category
  const [category, setCategory] = useState('');
  
  // Validation
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (currentData) {
      setName(currentData.name || '');
      setBio(currentData.bio || '');
      setUsername(currentData.username || '');
      setIsPublic(currentData.is_public ?? true);
      setLogoUrl(currentData.logo_url || null);
      setDocumentType(currentData.document_type || '');
      setDocumentNumber(currentData.document_number || '');
      setMainContact(currentData.main_contact || '');
      setContactPhone(currentData.contact_phone || '');
      setContactEmail(currentData.contact_email || '');
      setAddress(currentData.address || '');
      setCity(currentData.city || '');
      setCountry(currentData.country || '');
      setWebsite(currentData.website || '');
      setInstagram(currentData.instagram || '');
      setTiktok(currentData.tiktok || '');
      setFacebook(currentData.facebook || '');
      setLinkedin(currentData.linkedin || '');
      setCategory(currentData.category || '');
    }
  }, [currentData, open]);

  // Validate username in real-time
  useEffect(() => {
    const validateUsername = async () => {
      if (!username || username === currentData?.username) {
        setUsernameError(null);
        return;
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameError('Solo letras, números y guiones bajos');
        return;
      }

      if (username.length < 3) {
        setUsernameError('Mínimo 3 caracteres');
        return;
      }

      if (username.length > 30) {
        setUsernameError('Máximo 30 caracteres');
        return;
      }

      setCheckingUsername(true);
      try {
        const { data } = await supabase
          .from('clients')
          .select('id')
          .eq('username', username.toLowerCase())
          .neq('id', companyId)
          .maybeSingle();

        if (data) {
          setUsernameError('Este nombre de usuario ya está en uso');
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounce = setTimeout(validateUsername, 500);
    return () => clearTimeout(debounce);
  }, [username, currentData?.username, companyId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Solo se permiten imágenes',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'El archivo es muy grande (máx 5MB)',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!selectedFile) return logoUrl;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `company-${companyId}-${Date.now()}.${fileExt}`;
      const filePath = `companies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el logo',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateRequiredFields = (): boolean => {
    const requiredFields = [
      { value: name, label: 'Nombre de la empresa' },
      { value: documentType, label: 'Tipo de documento' },
      { value: documentNumber, label: 'Número de documento' },
      { value: mainContact, label: 'Contacto principal' },
      { value: contactPhone, label: 'Teléfono' },
      { value: address, label: 'Dirección' },
      { value: city, label: 'Ciudad' },
      { value: country, label: 'País' },
      { value: contactEmail, label: 'Email' },
      { value: website, label: 'Sitio Web' },
      { value: instagram, label: 'Instagram' },
      { value: tiktok, label: 'TikTok' },
      { value: facebook, label: 'Facebook' },
      { value: linkedin, label: 'LinkedIn' },
      { value: category, label: 'Categoría' },
    ];

    const emptyFields = requiredFields.filter(f => !f.value || f.value.trim() === '');
    
    if (emptyFields.length > 0) {
      toast({
        title: 'Campos requeridos',
        description: `Por favor completa: ${emptyFields.slice(0, 3).map(f => f.label).join(', ')}${emptyFields.length > 3 ? ` y ${emptyFields.length - 3} más` : ''}. Si un campo no aplica, escribe "NA".`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (usernameError) {
      toast({
        title: 'Error',
        description: usernameError,
        variant: 'destructive',
      });
      return;
    }

    if (!validateRequiredFields()) return;

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      if (selectedFile) {
        finalLogoUrl = await uploadLogo();
      }

      const { error } = await supabase
        .from('clients')
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          username: username.toLowerCase().trim() || null,
          is_public: isPublic,
          logo_url: finalLogoUrl,
          document_type: documentType.trim(),
          document_number: documentNumber.trim(),
          main_contact: mainContact.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          address: address.trim(),
          city: city.trim(),
          country: country.trim(),
          website: website.trim(),
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          facebook: facebook.trim(),
          linkedin: linkedin.trim(),
          category: category,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: 'Perfil actualizado',
        description: 'Los datos de la empresa se guardaron correctamente',
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el perfil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[95dvh] sm:max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Datos de la empresa
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Completa todos los campos. Si algún dato no aplica, escribe "NA".
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)] px-6">
          <div className="space-y-6 pb-6">
            {/* Logo */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={logoPreview || logoUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Building2 className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                  disabled={uploading}
                  type="button"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground">Logo de la empresa (opcional)</p>
            </div>

            <Separator />

            {/* Section: Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" />
                Información básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la empresa o marca *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre de tu empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Usuario para portafolio</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="nombreempresa"
                      className="pl-8"
                    />
                  </div>
                  {checkingUsername && (
                    <p className="text-xs text-muted-foreground">Verificando...</p>
                  )}
                  {usernameError && (
                    <p className="text-xs text-destructive">{usernameError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Descripción</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntanos sobre tu empresa..."
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Section: Legal Document */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                Documento de empresa
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de documento *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((doc) => (
                        <SelectItem key={doc.value} value={doc.value}>
                          {doc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Número de documento *</Label>
                  <Input
                    id="documentNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ej: 900123456-1 o NA"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Contact */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                Información de contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mainContact">Contacto principal *</Label>
                  <Input
                    id="mainContact"
                    value={mainContact}
                    onChange={(e) => setMainContact(e.target.value)}
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Teléfono / WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="contactPhone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contactEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contacto@empresa.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Location */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Ubicación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, edificio... o NA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País *</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="País"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section: Online Presence */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                Presencia digital
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">Sitio Web *</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://tuempresa.com o NA"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram *</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@usuario o NA"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok *</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <Input
                      id="tiktok"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@usuario o NA"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook *</Label>
                  <div className="relative">
                    <FacebookIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="facebook"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="Página o perfil o NA"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn *</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="linkedin"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="Perfil de empresa o NA"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Privacy */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-sm">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">Perfil público</p>
                  <p className="text-xs text-muted-foreground">
                    {isPublic ? 'Cualquiera puede ver tu perfil' : 'Solo usuarios asociados'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || uploading || !!usernameError}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar datos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
