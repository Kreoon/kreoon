import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';

/**
 * Detecta si el usuario es "solo estudiante":
 * - Autenticado.
 * - Tiene el rol global 'student' o su active_role es 'student'.
 * - NO tiene ningún otro rol funcional (talent/admin/client).
 *
 * Un student-only solo puede acceder a /academia/* y a su perfil.
 * Si se eleva a creador o empresa, gana roles adicionales y deja de ser "solo estudiante".
 */
export function useIsStudent(): boolean {
  const { user, roles, activeRole } = useAuth();
  if (!user) return false;

  const hasStudentRole = roles.includes('student' as any) || activeRole === ('student' as any);
  if (!hasStudentRole) return false;

  // Si tiene otros roles funcionales (talent/admin/client), ya no es "solo estudiante".
  const hasNonStudentRole = roles.some((r) => {
    const pg = getPermissionGroup(r);
    return pg !== 'student';
  });

  return !hasNonStudentRole;
}
