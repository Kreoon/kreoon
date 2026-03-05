import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, FileText, Globe, Instagram,
  Facebook, Twitter, Youtube, Linkedin, ChevronRight,
  AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOnboardingGate, ProfileData } from '@/hooks/useOnboardingGate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Zod schema
const profileSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo'),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-z0-9._-]+$/, 'Solo letras minúsculas, números, puntos y guiones'),
  phone: z.string().min(7, 'Teléfono inválido').max(20),
  email: z.string().email('Email inválido'),
  country: z.string().min(1, 'Selecciona un país'),
  city: z.string().min(2, 'Ciudad requerida'),
  address: z.string().min(5, 'Dirección muy corta'),
  nationality: z.string().min(1, 'Selecciona tu nacionalidad'),
  document_type: z.string().min(1, 'Selecciona tipo de documento'),
  document_number: z.string().min(3, 'Número de documento requerido'),
  date_of_birth: z.string().min(1, 'Fecha de nacimiento requerida'),
  social_instagram: z.string().optional(),
  social_facebook: z.string().optional(),
  social_tiktok: z.string().optional(),
  social_x: z.string().optional(),
  social_youtube: z.string().optional(),
  social_linkedin: z.string().optional(),
}).refine((data) => {
  // Al menos una red social
  return (
    (data.social_instagram && data.social_instagram.length > 0) ||
    (data.social_facebook && data.social_facebook.length > 0) ||
    (data.social_tiktok && data.social_tiktok.length > 0) ||
    (data.social_x && data.social_x.length > 0) ||
    (data.social_youtube && data.social_youtube.length > 0) ||
    (data.social_linkedin && data.social_linkedin.length > 0)
  );
}, {
  message: 'Debes agregar al menos una red social',
  path: ['social_network'],
}).refine((data) => {
  // Verificar edad >= 18
  if (!data.date_of_birth) return false;
  const dob = new Date(data.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}, {
  message: 'Debes ser mayor de 18 años para usar KREOON',
  path: ['date_of_birth'],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileDataStepProps {
  onComplete: () => void;
}

export function ProfileDataStep({ onComplete }: ProfileDataStepProps) {
  const {
    existingProfileData,
    countries,
    documentTypes,
    saveProfileData,
    checkUsernameAvailable,
    isSavingProfile,
  } = useOnboardingGate();

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [selectedCountry, setSelectedCountry] = useState(existingProfileData.country || '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: existingProfileData.full_name || '',
      username: existingProfileData.username || '',
      phone: existingProfileData.phone || '',
      email: existingProfileData.email || '',
      country: existingProfileData.country || '',
      city: existingProfileData.city || '',
      address: existingProfileData.address || '',
      nationality: existingProfileData.nationality || '',
      document_type: existingProfileData.document_type || '',
      document_number: existingProfileData.document_number || '',
      date_of_birth: existingProfileData.date_of_birth || '',
      social_instagram: existingProfileData.social_instagram || '',
      social_facebook: existingProfileData.social_facebook || '',
      social_tiktok: existingProfileData.social_tiktok || '',
      social_x: existingProfileData.social_x || '',
      social_youtube: existingProfileData.social_youtube || '',
      social_linkedin: existingProfileData.social_linkedin || '',
    },
  });

  const usernameValue = watch('username');
  const countryValue = watch('country');

  // Filtrar tipos de documento por país
  const filteredDocTypes = documentTypes.filter(dt =>
    dt.countries.includes(countryValue) || dt.id === 'passport' || dt.id === 'other'
  );

  // Verificar username con debounce
  useEffect(() => {
    if (!usernameValue || usernameValue.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const normalized = usernameValue.toLowerCase();
    if (normalized === existingProfileData.username?.toLowerCase()) {
      setUsernameStatus('available');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(normalized);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameValue, checkUsernameAvailable, existingProfileData.username]);

  // Actualizar país seleccionado
  useEffect(() => {
    if (countryValue !== selectedCountry) {
      setSelectedCountry(countryValue);
      // Limpiar tipo de documento si no aplica al nuevo país
      const currentDocType = watch('document_type');
      const stillValid = filteredDocTypes.some(dt => dt.id === currentDocType);
      if (!stillValid) {
        setValue('document_type', '');
      }
    }
  }, [countryValue, selectedCountry, filteredDocTypes, setValue, watch]);

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    if (usernameStatus === 'taken') {
      toast.error('El username ya está en uso');
      return;
    }

    try {
      await saveProfileData(data as ProfileData);
      toast.success('Datos guardados correctamente');
      onComplete();
    } catch (error: any) {
      if (error.message === 'username_taken') {
        toast.error('El username ya está en uso');
        setUsernameStatus('taken');
      } else if (error.message === 'age_under_18') {
        toast.error('Debes ser mayor de 18 años');
      } else {
        toast.error('Error al guardar los datos');
      }
    }
  }, [saveProfileData, usernameStatus, onComplete]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Completa tu perfil
        </h1>
        <p className="text-white/60">
          Para usar KREOON necesitas completar tu información.
          Esto nos ayuda a protegerte y garantizar la seguridad de la comunidad.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Sección: Información Personal */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Información Personal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre completo */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Nombre completo <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('full_name')}
                placeholder="Tu nombre completo"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              {errors.full_name && (
                <p className="text-xs text-red-400">{errors.full_name.message}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Username <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
                <Input
                  {...register('username')}
                  placeholder="tu_username"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-8 pr-10"
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                    setValue('username', value);
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {usernameStatus === 'taken' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              {errors.username && (
                <p className="text-xs text-red-400">{errors.username.message}</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-xs text-red-400">Este username ya está en uso</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Correo electrónico <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="tu@email.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-10"
                  readOnly
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Teléfono <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+57 300 123 4567"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-10"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-400">{errors.phone.message}</p>
              )}
            </div>

            {/* Fecha de nacimiento */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white/90">
                Fecha de nacimiento <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('date_of_birth')}
                type="date"
                className="bg-white/5 border-white/10 text-white [&::-webkit-calendar-picker-indicator]:invert"
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
              {errors.date_of_birth && (
                <p className="text-xs text-red-400">{errors.date_of_birth.message}</p>
              )}
              <p className="text-xs text-white/40">Debes ser mayor de 18 años para usar KREOON</p>
            </div>
          </div>
        </section>

        {/* Sección: Ubicación */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            Ubicación
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* País */}
            <div className="space-y-2">
              <Label className="text-white/90">
                País <span className="text-red-400">*</span>
              </Label>
              <Select
                value={watch('country')}
                onValueChange={(v) => setValue('country', v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecciona tu país" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="mr-2">{country.flag}</span>
                      {country.name_es}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-xs text-red-400">{errors.country.message}</p>
              )}
            </div>

            {/* Ciudad */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Ciudad <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('city')}
                placeholder="Tu ciudad"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              {errors.city && (
                <p className="text-xs text-red-400">{errors.city.message}</p>
              )}
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Dirección <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('address')}
                placeholder="Tu dirección completa"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              {errors.address && (
                <p className="text-xs text-red-400">{errors.address.message}</p>
              )}
            </div>

            {/* Nacionalidad */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Nacionalidad <span className="text-red-400">*</span>
              </Label>
              <Select
                value={watch('nationality')}
                onValueChange={(v) => setValue('nationality', v)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecciona tu nacionalidad" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="mr-2">{country.flag}</span>
                      {country.name_es}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.nationality && (
                <p className="text-xs text-red-400">{errors.nationality.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Sección: Documento de Identidad */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Documento de Identidad
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de documento */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Tipo de documento <span className="text-red-400">*</span>
              </Label>
              <Select
                value={watch('document_type')}
                onValueChange={(v) => setValue('document_type', v)}
                disabled={!countryValue}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={countryValue ? "Selecciona tipo" : "Primero selecciona país"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredDocTypes.map((docType) => (
                    <SelectItem key={docType.id} value={docType.id}>
                      {docType.label_es}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.document_type && (
                <p className="text-xs text-red-400">{errors.document_type.message}</p>
              )}
            </div>

            {/* Número de documento */}
            <div className="space-y-2">
              <Label className="text-white/90">
                Número de documento <span className="text-red-400">*</span>
              </Label>
              <Input
                {...register('document_number')}
                placeholder={
                  filteredDocTypes.find(dt => dt.id === watch('document_type'))?.format_hint ||
                  'Número de documento'
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              {errors.document_number && (
                <p className="text-xs text-red-400">{errors.document_number.message}</p>
              )}
            </div>
          </div>
        </section>

        {/* Sección: Redes Sociales */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Redes Sociales
            <span className="text-xs text-white/40 font-normal">(mínimo 1 requerida)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                Instagram
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
                <Input
                  {...register('social_instagram')}
                  placeholder="tu_usuario"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-8"
                />
              </div>
            </div>

            {/* TikTok */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
                TikTok
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
                <Input
                  {...register('social_tiktok')}
                  placeholder="tu_usuario"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-8"
                />
              </div>
            </div>

            {/* Facebook */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-400" />
                Facebook
              </Label>
              <Input
                {...register('social_facebook')}
                placeholder="facebook.com/tu_perfil"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            {/* X (Twitter) */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                X (Twitter)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
                <Input
                  {...register('social_x')}
                  placeholder="tu_usuario"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-8"
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-400" />
                YouTube
              </Label>
              <Input
                {...register('social_youtube')}
                placeholder="youtube.com/@tu_canal"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label className="text-white/90 flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-blue-500" />
                LinkedIn
              </Label>
              <Input
                {...register('social_linkedin')}
                placeholder="linkedin.com/in/tu_perfil"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {(errors as any).social_network && (
            <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {(errors as any).social_network.message}
            </p>
          )}
        </section>

        {/* Submit */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isSavingProfile || usernameStatus === 'taken'}
            className={cn(
              "w-full h-12 text-base font-semibold",
              "bg-gradient-to-r from-purple-600 to-pink-600",
              "hover:from-purple-500 hover:to-pink-500",
              "disabled:opacity-50"
            )}
          >
            {isSavingProfile ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Siguiente: Aceptar términos
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfileDataStep;
