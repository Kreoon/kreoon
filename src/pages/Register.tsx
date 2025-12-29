import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, User, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_registration_open: boolean;
  default_role: AppRole;
}

export default function Register() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const { user, loading: authLoading, rolesLoaded, roles } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(!!slug);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [organizationType, setOrganizationType] = useState<'agency' | 'community' | 'academy'>('agency');
  const [accountType, setAccountType] = useState<'organization' | 'individual'>('organization');

  // Fetch organization if slug provided
  useEffect(() => {
    if (slug) {
      fetchOrganization();
    }
  }, [slug]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading && rolesLoaded) {
      if (roles.length > 0) {
        navigate('/');
      }
    }
  }, [user, authLoading, rolesLoaded, roles, navigate]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, description, is_registration_open, default_role')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        toast({
          title: 'Organización no encontrada',
          description: 'El enlace de registro no es válido',
          variant: 'destructive'
        });
        navigate('/register');
        return;
      }

      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!fullName.trim() || !companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    try {
      // Sign up the user
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            account_type: 'organization',
            organization_type: organizationType,
            requested_role: 'admin',
            company_name: companyName,
          }
        }
      });

      if (error) throw error;

      if (authData.user) {
        // Create the organization
        const orgSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: companyName,
            slug: orgSlug,
            organization_type: organizationType,
            admin_name: fullName,
            admin_email: email,
            is_registration_open: false,
            created_by: authData.user.id,
          })
          .select('id')
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
          throw orgError;
        }

        if (orgData) {
          // Add user as org member and owner
          await supabase.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
            is_owner: true,
          });

          await supabase.from('organization_member_roles').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
          });

          // Update profile with current org and active status
          await supabase
            .from('profiles')
            .update({ 
              current_organization_id: orgData.id,
              organization_status: 'active'
            })
            .eq('id', authData.user.id);
        }

        toast({
          title: 'Organización creada',
          description: 'Tu organización ha sido registrada exitosamente',
        });
        
        navigate('/auth');
      }
    } catch (error: any) {
      toast({
        title: 'Error al registrar',
        description: error.message?.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!organization) {
      toast({
        title: 'Error',
        description: 'No hay organización seleccionada',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    if (!organization.is_registration_open) {
      toast({
        title: 'Registro cerrado',
        description: 'Esta organización no tiene registro público abierto',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            account_type: 'individual',
            organization_id: organization.id,
          }
        }
      });

      if (error) throw error;

      if (authData.user) {
        // Add user to organization
        await supabase.from('organization_members').insert({
          organization_id: organization.id,
          user_id: authData.user.id,
          role: organization.default_role || 'creator',
        });

        await supabase.from('organization_member_roles').insert({
          organization_id: organization.id,
          user_id: authData.user.id,
          role: organization.default_role || 'creator',
        });

        // Update profile
        await supabase
          .from('profiles')
          .update({ 
            current_organization_id: organization.id,
            organization_status: 'active'
          })
          .eq('id', authData.user.id);

        toast({
          title: 'Cuenta creada',
          description: `Te has unido a ${organization.name}`,
        });
        
        navigate('/pending-access');
      }
    } catch (error: any) {
      toast({
        title: 'Error al registrar',
        description: error.message?.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithoutOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            account_type: 'individual',
          }
        }
      });

      if (error) throw error;

      if (authData.user) {
        // Update profile with pending status
        await supabase
          .from('profiles')
          .update({ 
            organization_status: 'pending_assignment'
          })
          .eq('id', authData.user.id);

        toast({
          title: 'Cuenta creada',
          description: 'Tu cuenta está pendiente de ser asignada a una organización',
        });
        
        navigate('/pending-access');
      }
    } catch (error: any) {
      toast({
        title: 'Error al registrar',
        description: error.message?.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // If we have a slug, show join form for that organization
  if (slug && organization) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a KREOON
          </Button>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="text-center">
              {organization.logo_url ? (
                <img 
                  src={organization.logo_url} 
                  alt={organization.name}
                  className="w-20 h-20 rounded-xl mx-auto mb-4 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
              )}
              <CardTitle className="text-2xl text-white">{organization.name}</CardTitle>
              {organization.description && (
                <CardDescription className="text-slate-400">
                  {organization.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {organization.is_registration_open ? (
                <form onSubmit={handleJoinOrganization} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-slate-300">Nombre completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Unirme a {organization.name}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">
                    El registro público no está habilitado para esta organización.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Contacta al administrador para solicitar acceso.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-slate-500 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <button 
              onClick={() => navigate('/auth')}
              className="text-violet-400 hover:text-violet-300"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Default register page - create organization or register without
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a KREOON
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
            KREOON
          </h1>
          <p className="text-slate-400">Crea tu cuenta</p>
        </div>

        <Tabs value={accountType} onValueChange={(v) => setAccountType(v as 'organization' | 'individual')}>
          <TabsList className="w-full bg-slate-800 mb-6">
            <TabsTrigger value="organization" className="flex-1 data-[state=active]:bg-violet-600">
              <Building2 className="w-4 h-4 mr-2" />
              Crear organización
            </TabsTrigger>
            <TabsTrigger value="individual" className="flex-1 data-[state=active]:bg-violet-600">
              <User className="w-4 h-4 mr-2" />
              Registro individual
            </TabsTrigger>
          </TabsList>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="pt-6">
              <TabsContent value="organization" className="mt-0">
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-slate-300">Tu nombre completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyName" className="text-slate-300">Nombre de la organización</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Mi Agencia UGC"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgType" className="text-slate-300">Tipo de organización</Label>
                    <Select value={organizationType} onValueChange={(v) => setOrganizationType(v as any)}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agency">Agencia</SelectItem>
                        <SelectItem value="community">Comunidad</SelectItem>
                        <SelectItem value="academy">Academia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Crear mi organización
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="individual" className="mt-0">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Nota:</strong> Registrarte sin organización significa que tu cuenta quedará pendiente hasta que un administrador te asigne a una.
                  </p>
                </div>
                <form onSubmit={handleRegisterWithoutOrg} className="space-y-4">
                  <div>
                    <Label htmlFor="fullNameInd" className="text-slate-300">Nombre completo</Label>
                    <Input
                      id="fullNameInd"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailInd" className="text-slate-300">Correo electrónico</Label>
                    <Input
                      id="emailInd"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordInd" className="text-slate-300">Contraseña</Label>
                    <Input
                      id="passwordInd"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Registrarme
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <button 
            onClick={() => navigate('/auth')}
            className="text-violet-400 hover:text-violet-300"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
