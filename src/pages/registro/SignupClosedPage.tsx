import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { RegistrationShell } from "@/components/registro/RegistrationShell";

type Audience = "brand" | "organization";

const COPY: Record<Audience, { title: string; body: string }> = {
  brand: {
    title: "El registro de marcas no está disponible",
    body: "Por ahora solo estamos recibiendo creadores. Si tu marca ya trabaja con nosotros, inicia sesión con tu cuenta.",
  },
  organization: {
    title: "La creación de organizaciones no está disponible",
    body: "Las organizaciones se habilitan directamente desde el equipo de Kreoon. Si ya tienes acceso, inicia sesión con tu cuenta.",
  },
};

/**
 * Estado informativo para /unete/marcas, /unete/organizaciones y /marca-referida.
 * Sin formulario de alta y sin convertir la intención en registro de creador: se ofrece,
 * como decisión explícita del visitante, el camino de creadores.
 */
export default function SignupClosedPage({ audience }: { audience: Audience }) {
  const { title, body } = COPY[audience];
  return (
    <RegistrationShell>
      <Helmet>
        <title>{title} | Kreoon</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Lock className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex w-full flex-col gap-2 pt-2">
          <Button asChild className="h-12 w-full rounded-xl">
            <Link to="/auth">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl">
            <Link to="/registro">Soy creador y quiero unirme</Link>
          </Button>
        </div>
      </div>
    </RegistrationShell>
  );
}
