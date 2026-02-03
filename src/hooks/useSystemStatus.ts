import { useState, useEffect } from "react";
import type { SystemStatus } from "@/components/ui/kreoon/SystemStatusBanner";

export interface SystemStatusData {
  status: SystemStatus;
  message: string;
  link?: string;
}

/**
 * Hook para obtener el estado del sistema.
 * Por ahora retorna null (sin incidentes).
 * TODO: Implementar polling a API o tabla de Supabase para obtener el estado real.
 */
export function useSystemStatus(): SystemStatusData | null {
  const [status, setStatus] = useState<SystemStatusData | null>(null);

  useEffect(() => {
    // TODO: Implementar lógica para obtener estado del sistema
    // Ejemplo: polling a /api/system-status o tabla Supabase 'system_status'
    
    // Ejemplo hardcoded (para testing):
    // setStatus({
    //   status: 'maintenance',
    //   message: 'Mantenimiento programado hoy de 2-4 PM',
    //   link: 'https://status.kreoon.com',
    // });

    // Por defecto, no hay incidentes
    setStatus(null);
  }, []);

  return status;
}
