/**
 * Layout específico para la vista de perfil del creador.
 *
 * - Usuario autenticado: MainLayout completo (sidebar + header de plataforma)
 * - No autenticado: Solo renderiza children (el TemplateProfileRenderer maneja su propio header)
 */

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';

interface ProfileLayoutProps {
  children: ReactNode;
}

export function ProfileLayout({ children }: ProfileLayoutProps) {
  const { user, loading } = useAuth();

  // Mientras carga auth, renderizar children directamente
  if (loading) {
    return <>{children}</>;
  }

  // Usuario autenticado: MainLayout con sidebar y header
  if (user) {
    return <MainLayout>{children}</MainLayout>;
  }

  // No autenticado: solo children (TemplateProfileRenderer tiene su propio header)
  return <>{children}</>;
}
