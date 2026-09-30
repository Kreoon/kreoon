import { ReactNode } from 'react';

interface TalentGateProps {
  children: ReactNode;
}

/**
 * TalentGate — RETIRADO como bloqueo de entrada.
 *
 * Antes impedía a los talentos sin "llaves" (3 referidos) acceder a rutas públicas como
 * /marketplace. En el relanzamiento el acceso ya no depende de llaves ni referidos; el programa
 * de referidos sigue existiendo como beneficio opcional (edge `referral-service`, `useReferralGate`).
 * Se conserva el componente como pass-through para no romper importaciones existentes.
 */
export function TalentGate({ children }: TalentGateProps) {
  return <>{children}</>;
}
