import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/** Respuestas cortas y fieles a lo que el producto hace hoy: sin precios ni promesas de trabajo. */
export const FAQ_ITEMS = [
  {
    q: "¿Para quién es Kreoon?",
    a: "Para personas que crean contenido: video, fotografía, escritura, diseño y más. El registro público es solo para creadores.",
  },
  {
    q: "¿Cómo empiezo?",
    a: "Crea tu cuenta con Google o con tu correo y completa tu perfil paso a paso. Puedes dejar partes para después y retomarlas cuando quieras.",
  },
  {
    q: "¿Por qué entro por UGC Colombia?",
    a: "UGC Colombia es la organización en la que hoy está abierto el ingreso, y tu cuenta queda asociada a ella. Crear la cuenta no garantiza proyectos ni encargos.",
  },
  {
    q: "¿Mi perfil es público?",
    a: "No automáticamente. Crear la cuenta y completar tu perfil no publica nada: tú decides cuándo mostrar tu portafolio.",
  },
  {
    q: "¿Cómo recupero mi acceso?",
    a: "En «Iniciar sesión» elige «¿Olvidaste tu contraseña?» y te enviamos un enlace. Si entraste con Google, vuelve a usar ese mismo botón.",
  },
] as const;

export function HomeFaq() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-titulo" className="home-anchor py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <h2 id="preguntas-titulo" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="min-h-14 py-4 text-left text-base font-semibold hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
