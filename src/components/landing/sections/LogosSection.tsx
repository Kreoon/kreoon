import * as React from "react";
import { motion } from "framer-motion";

export interface LogosSectionProps {
  logos?: Array<{ name: string; logo: string }>;
}

const PLACEHOLDER_COUNT = 6;

const defaultPlaceholders = Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => ({
  name: `Logo ${i + 1}`,
  logo: "",
}));

function LogoItem({
  name,
  logo,
  isPlaceholder,
}: {
  name: string;
  logo: string;
  isPlaceholder: boolean;
}) {
  if (isPlaceholder) {
    return (
      <div
        className="flex h-12 w-28 shrink-0 items-center justify-center rounded-sm border border-dashed border-kreoon-border text-sm text-kreoon-text-muted transition-colors hover:border-kreoon-purple-500/40 hover:text-kreoon-text-secondary md:h-14 md:w-32"
        aria-hidden
      >
        {name}
      </div>
    );
  }
  return (
    <div
      className="flex h-12 w-28 shrink-0 items-center justify-center px-4 md:h-14 md:w-36"
      title={name}
    >
      <img
        src={logo}
        alt={name}
        className="max-h-8 w-full max-w-[120px] object-contain object-center opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
      />
    </div>
  );
}

export function LogosSection({ logos }: LogosSectionProps) {
  const items = logos?.length ? logos : defaultPlaceholders;
  const isPlaceholder = !logos?.length;
  const useMarquee = !isPlaceholder && items.length >= 4;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden py-12"
    >
      <div className="relative bg-kreoon-bg-secondary/80">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-8 text-center text-sm uppercase tracking-wider text-kreoon-text-muted">
            {isPlaceholder
              ? "Marcas que ya crean con nosotros"
              : "Empresas que confían en Kreoon"}
          </p>

          {useMarquee ? (
            /* Marquee: duplicar fila y animar, pausa en hover */
            <div className="group/marquee overflow-hidden">
              <div className="flex w-max animate-logos-marquee gap-12 px-4 [animation-duration:40s] hover:[animation-play-state:paused] group-hover/marquee:[animation-play-state:paused]">
                {[1, 2].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0 items-center gap-12"
                  >
                    {items.map((item) => (
                      <LogoItem
                        key={`${copy}-${item.name}`}
                        name={item.name}
                        logo={item.logo}
                        isPlaceholder={false}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Grid estático: mobile 2 columnas, desktop fila centrada */
            <div className="grid grid-cols-2 place-items-center gap-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 md:gap-12">
              {items.map((item) => (
                <LogoItem
                  key={item.name}
                  name={item.name}
                  logo={item.logo}
                  isPlaceholder={isPlaceholder}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keyframe para marquee */}
      <style>{`
        @keyframes logos-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-logos-marquee {
          animation: logos-marquee linear infinite;
        }
      `}</style>
    </motion.section>
  );
}
