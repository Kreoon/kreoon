import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { PlatformTrash } from '@/components/trash/PlatformTrash';
import { Trash2, Shield } from 'lucide-react';

export default function PapeleraPage() {
  const navigate = useNavigate();
  const { isPlatformRoot, loading } = useOrgOwner();

  // Redirect non-root users
  useEffect(() => {
    if (!loading && !isPlatformRoot) {
      navigate('/dashboard');
    }
  }, [isPlatformRoot, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPlatformRoot) {
    return null;
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-destructive/10 border border-destructive/20">
          <Trash2 className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Papelera de la Plataforma</h1>
          <p className="text-muted-foreground">
            Recupera elementos eliminados de toda la plataforma
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-3 p-4 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
        <Shield className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          <strong>Acceso restringido:</strong> Solo los administradores root pueden ver y restaurar elementos de la papelera.
          Todos los elementos eliminados se guardan automáticamente con backup completo.
        </div>
      </div>

      {/* Trash component */}
      <PlatformTrash />
    </div>
  );
}
