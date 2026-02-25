/**
 * Utilidades de navegación: rutas de dashboard según roles.
 */

export function getDashboardPath(
  roles: string[],
  activeRole?: string | null
): string {
  // Users without roles go to marketplace (talents/brands without org)
  if (roles.length === 0) return "/marketplace";

  if (activeRole && roles.includes(activeRole)) {
    switch (activeRole) {
      case "admin":
      case "team_leader":
      case "ambassador":
        return "/dashboard";
      case "strategist":
        return "/strategist-dashboard";
      case "creator":
        return "/creator-dashboard";
      case "editor":
        return "/editor-dashboard";
      case "client":
        return "/client-dashboard";
      case "trafficker":
        return "/marketing";
    }
  }

  if (roles.includes("admin")) return "/dashboard";
  if (roles.includes("team_leader")) return "/dashboard";
  if (roles.includes("ambassador")) return "/dashboard";
  if (roles.includes("strategist")) return "/strategist-dashboard";
  if (roles.includes("trafficker")) return "/marketing";
  if (roles.includes("creator")) return "/creator-dashboard";
  if (roles.includes("editor")) return "/editor-dashboard";
  if (roles.includes("client")) return "/client-dashboard";

  return "/marketplace";
}
