import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLovable } from '@/integrations/supabase/lovable-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Lock, ArrowLeft, Eye, EyeOff, AlertTriangle, CheckCircle2, Loader2, Sparkles, User, Briefcase, Video, Scissors } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

interface RegistrationPageConfig {
  welcome_title?: string;
  welcome_message?: string;
  banner_url?: string;
  primary_color?: string;
  show_description?: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_registration_open: boolean;
  registration_require_invite: boolean;
  default_role: string;
  registration_page_config: RegistrationPageConfig | null;
}

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es muy largo'),
  email: z.string().trim().email('Email inválido').max(255, 'El email es muy largo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72, 'La contraseña es muy larga'),
  confirmPassword: z.string(),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function OrgRegister() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [bio, setBio] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // AI Role suggestion
  const [suggestedRole, setSuggestedRole] = useState<{ role: string; confidence: number; reasoning: string } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const fetchRoleSuggestion = async () => {
    if (!fullName.trim() || !email.trim() || !organization?.id) return;
    
    setLoadingSuggestion(true);
    try {
      // Use supabaseLovable for edge functions
      const response = await supabaseLovable.functions.invoke('suggest-role', {
        body: { 
          fullName: fullName.trim(),
          email: email.trim(),
          bio: bio.trim(),
          organizationId: organization.id
        }
      });
      
      if (response.data && response.data.suggestedRole) {
        setSuggestedRole({
          role: response.data.suggestedRole,
          confidence: response.data.confidence || 0.5,
          reasoning: response.data.reasoning || ''
        });
      }
    } catch (err) {
      console.error('Error fetching role suggestion:', err);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchOrganization();
    }
  }, [slug]);

  const fetchOrganization = async () => {
    try {
      console.log('[OrgRegister] Fetching organization with slug:', slug);
      
      // Try using the edge function for public access (bypasses RLS)
      // Use supabaseLovable since edge functions are hosted on Lovable Cloud
      const { data: edgeData, error: edgeError } = await supabaseLovable.functions.invoke('org-public-info', {
        body: { slug }
      });

      if (edgeError) {
        console.error('[OrgRegister] Edge function error:', edgeError);
        // Fallback to direct query
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, description, is_registration_open, registration_require_invite, default_role, registration_page_config')
          .eq('slug', slug)
          .single();

        console.log('[OrgRegister] Direct query result:', { data, error });

        if (error || !data) {
          console.error('[OrgRegister] Organization not found. Error:', error);
          setError('Organización no encontrada');
          return;
        }

        if (!data.is_registration_open) {
          setError('El registro no está habilitado para esta organización');
          return;
        }

        setOrganization(data as Organization);

        if (!data.registration_require_invite) {
          setCodeVerified(true);
        }
        return;
      }

      console.log('[OrgRegister] Edge function result:', edgeData);

      if (!edgeData || edgeData.error) {
        console.error('[OrgRegister] Organization not found via edge function:', edgeData?.error);
        setError('Organización no encontrada');
        return;
      }

      if (!edgeData.is_registration_open) {
        setError('El registro no está habilitado para esta organización');
        return;
      }

      setOrganization(edgeData as Organization);

      if (!edgeData.registration_require_invite) {
        setCodeVerified(true);
      }
    } catch (err) {
      console.error('[OrgRegister] Error loading organization:', err);
      setError('Error al cargar la organización');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      toast.error('Ingresa el código de invitación');
      return;
    }

    setSubmitting(true);
    try {
      // Get client IP (simplified - in production use a more robust method)
      const ip = 'client-' + Math.random().toString(36).substring(7);

      const { data, error } = await supabase.rpc('validate_registration_code', {
        org_slug: slug,
        code: inviteCode.trim().toUpperCase(),
        ip: ip
      });

      if (error) throw error;

      const result = data as { valid: boolean; error?: string };

      if (!result.valid) {
        switch (result.error) {
          case 'invalid_code':
            toast.error('Código inválido o expirado');
            break;
          case 'rate_limited':
            toast.error('Demasiados intentos. Intenta de nuevo en 1 hora.');
            break;
          case 'registration_disabled':
            toast.error('El registro está deshabilitado');
            break;
          default:
            toast.error('Error al verificar el código');
        }
        return;
      }

      setCodeVerified(true);
      toast.success('Código verificado correctamente');
    } catch (err) {
      console.error('Error verifying code:', err);
      toast.error('Error al verificar el código');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate form
    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      inviteCode: organization?.registration_require_invite ? inviteCode : undefined,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    // Validate role selection
    if (!selectedRole) {
      setFormErrors(prev => ({ ...prev, role: 'Debes seleccionar un rol' }));
      toast.error('Por favor selecciona cómo te unirás a la plataforma');
      return;
    }

    if (!organization) return;

    setSubmitting(true);
    
    // Use selected role - already validated above
    const roleToAssign = selectedRole as 'creator' | 'editor' | 'client' | 'admin' | 'strategist' | 'ambassador';
    
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email ya está registrado. Intenta iniciar sesión.');
        } else {
          toast.error('Error al crear la cuenta: ' + authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Error al crear la cuenta');
        return;
      }

      const userId = authData.user.id;

      // Wait for the profile trigger to complete OR create profile manually if trigger doesn't exist
      let profileExists = false;
      for (let i = 0; i < 5; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (profile) {
          profileExists = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // If profile doesn't exist after waiting, create it manually (fallback for missing trigger)
      if (!profileExists) {
        console.log('Profile not created by trigger, creating manually...');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: email.trim(),
            full_name: fullName.trim(),
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Error creating profile manually:', profileError);
          toast.error('Error: No se pudo crear tu perfil. Por favor contacta soporte.');
          return;
        }
        console.log('Profile created manually');
      }

      // Now register to organization with the selected role
      // This function now raises exceptions on failure instead of returning FALSE
      const { data, error: regError } = await supabase
        .rpc('register_user_to_organization', {
          p_organization_id: organization.id,
          p_user_id: userId,
          p_role: roleToAssign
        });
      
      if (regError) {
        console.error('Error registering user to organization:', regError);
        toast.error('Error al asignar tu rol en la organización. Por favor contacta soporte.');
        return;
      }

      console.log('User successfully registered to organization with role:', roleToAssign);
      
      // Send email notification to admins (fire and forget)
      supabase.functions.invoke('notify-new-member', {
        body: {
          user_id: userId,
          organization_id: organization.id,
          role: roleToAssign,
          user_name: fullName,
          user_email: email
        }
      }).catch(err => {
        console.error('Error invoking notify-new-member:', err);
      });

      toast.success('¡Cuenta creada exitosamente!');
      
      // Redirect to welcome page with role info
      navigate(`/welcome?role=${roleToAssign}`);
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Error durante el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">No disponible</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => navigate('/auth')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageConfig = organization?.registration_page_config || {};
  const welcomeTitle = pageConfig.welcome_title || organization?.name;
  const welcomeMessage = pageConfig.welcome_message || organization?.description || 'Únete a nuestra organización';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Banner */}
        {pageConfig.banner_url && (
          <div className="h-32 w-full">
            <img 
              src={pageConfig.banner_url} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={organization?.logo_url || ''} />
              <AvatarFallback className="bg-primary/10 text-2xl">
                <Building2 className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <CardTitle className="text-2xl">{welcomeTitle}</CardTitle>
            <CardDescription className="mt-2">
              {welcomeMessage}
            </CardDescription>
            {pageConfig.show_description && organization?.description && pageConfig.welcome_message !== organization.description && (
              <p className="mt-3 text-sm text-muted-foreground">
                {organization.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!codeVerified && organization?.registration_require_invite ? (
            // Code verification step
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-muted/50 mb-4">
                <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Este registro es exclusivo para miembros invitados.
                  <br />
                  Solicita el código a tu administrador.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Código de Invitación</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC12345"
                  className="text-center text-lg tracking-widest font-mono uppercase"
                  maxLength={12}
                />
              </div>
              <Button 
                onClick={handleVerifyCode} 
                className="w-full" 
                disabled={submitting || !inviteCode.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Código'
                )}
              </Button>
            </div>
          ) : (
            // Registration form
            <form onSubmit={handleSubmit} className="space-y-4">
              {codeVerified && organization?.registration_require_invite && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 text-success text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Código verificado
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-1">
                  Nombre Completo
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                />
                {formErrors.fullName && (
                  <p className="text-xs text-destructive">{formErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  Email
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>

              {/* Bio field for AI suggestion */}
              <div className="space-y-2">
                <Label htmlFor="bio">Cuéntanos sobre ti (opcional)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={fetchRoleSuggestion}
                  placeholder="¿Qué haces? ¿Cuál es tu experiencia? ¿Qué buscas en la plataforma?"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Esto nos ayuda a personalizar tu experiencia
                </p>
              </div>

              {/* AI Role Suggestion */}
              {(loadingSuggestion || suggestedRole) && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Sugerencia de IA</span>
                  </div>
                  {loadingSuggestion ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando tu perfil...
                    </div>
                  ) : suggestedRole && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {suggestedRole.role === 'creator' && <Video className="h-4 w-4 text-primary" />}
                        {suggestedRole.role === 'editor' && <Briefcase className="h-4 w-4 text-primary" />}
                        {suggestedRole.role === 'client' && <User className="h-4 w-4 text-primary" />}
                        <span className="font-medium capitalize">
                          {suggestedRole.role === 'creator' ? 'Creador' : 
                           suggestedRole.role === 'editor' ? 'Editor' : 'Cliente'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({suggestedRole.confidence}% confianza)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {suggestedRole.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Role selector - Required */}
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-1">
                  ¿Cómo te unirás a la plataforma?
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedRole} onValueChange={(value) => {
                  setSelectedRole(value);
                  setFormErrors(prev => ({ ...prev, role: '' }));
                }}>
                  <SelectTrigger id="role" className={formErrors.role ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecciona tu rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>Creador de Contenido</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4" />
                        <span>Editor de Video</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="client">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>Cliente / Marca</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.role ? (
                  <p className="text-xs text-destructive">{formErrors.role}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Esto determinará tu experiencia inicial en la plataforma
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1">
                  Contraseña
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-destructive">{formErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                  Confirmar Contraseña
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                />
                {formErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Tu cuenta quedará vinculada a{' '}
                <span className="font-medium">{organization?.name}</span>
              </p>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Button 
            variant="link" 
            className="text-sm text-muted-foreground"
            onClick={() => navigate('/auth')}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
