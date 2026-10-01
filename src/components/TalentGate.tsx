import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardPathForRoles } from '@/lib/routing/postAuth';
import { isBlockedForProduction, isProductionOnlyTalent } from '@/lib/creatorScope';

interface TalentGateProps {
  children: ReactNode;
}

/**
 * TalentGate — envoltorio de las páginas públicas del marketplace.
 *
 * Antes impedía a los talentos sin "llaves" (3 referidos) acceder a /marketplace; en el relanzamiento
 * eso se retiró. Ahora solo redirige a creadores/editores con sesión fuera de las páginas para explorar
 * a otros creadores (decisión 2026-10-01): visitantes y marcas siguen viéndolas igual.
 */
export function TalentGate({ children }: TalentGateProps) {
  const { user, roles, rolesLoaded, isPlatformAdmin } = useAuth();
  const { pathname } = useLocation();

  if (user && rolesLoaded && !isPlatformAdmin && isProductionOnlyTalent(roles) && isBlockedForProduction(pathname)) {
    return <Navigate to={getDashboardPathForRoles(roles)} replace />;
  }
  return <>{children}</>;
}
