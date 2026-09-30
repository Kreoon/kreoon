import { Navigate, useSearchParams } from "react-router-dom";
import { sanitizeReturnTo } from "@/lib/registration/returnTo";

/**
 * /bienvenida — destino único tras crear la cuenta de creador.
 * OnboardingGateProvider muestra el asistente sobre esta ruta mientras el onboarding esté incompleto;
 * cuando ya está completo (o la persona regresa a este enlace) aterriza aquí y sigue a su destino
 * validado o a su espacio de creador. Sin bucles: nunca redirige hacia /registro ni /auth.
 */
export default function CreatorWelcomeRoute() {
  const [params] = useSearchParams();
  const next = sanitizeReturnTo(params.get("next"));
  return <Navigate to={next ?? "/creator-dashboard"} replace />;
}
