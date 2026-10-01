import { Palette, Sparkles, UserPlus } from "lucide-react";

const STEPS = [
  {
    Icon: UserPlus,
    title: "Crea tu cuenta",
    text: "Con Google o con tu correo. Es rápido y puedes retomarlo cuando quieras.",
  },
  {
    Icon: Palette,
    title: "Dale tu estilo a tu perfil",
    text: "Tu nombre público, tu foto y lo que haces. Puedes dejar partes para después.",
  },
  {
    Icon: Sparkles,
    title: "Empieza a mostrar lo que haces",
    text: "Cuando estés listo, decides qué publicar. Crear la cuenta no publica nada por sí sola.",
  },
] as const;

/** «De una idea a tu espacio creativo»: línea de tiempo, no tarjetas, para variar el ritmo. */
export function HomeSteps() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="home-anchor py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <h2 id="como-funciona-titulo" className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          De una idea a tu espacio creativo
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="relative flex gap-4 md:flex-col md:gap-5">
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
                  aria-hidden
                >
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-border md:block md:w-[calc(100%-3.5rem)]" aria-hidden />
                )}
              </div>
              <div>
                <Icon className="mb-2 hidden h-5 w-5 text-primary md:block" aria-hidden />
                <h3 className="text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
