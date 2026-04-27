import { useState } from "react";
import { motion } from "framer-motion";
import { LandingLayout } from "@/components/landing/LandingLayout";
import { HeroOrbCanvas } from "@/components/landing/sections/HeroOrbCanvas";
import { AuthModal } from "@/components/auth/AuthModal";
import { FileText, Clock, ArrowRight } from "lucide-react";

export default function BlogPage() {
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
  }>({ open: false, tab: "login" });

  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthModal({ open: true, tab });
  };

  return (
    <>
      <HeroOrbCanvas />
      <LandingLayout onOpenAuth={handleOpenAuth}>
        <div className="relative min-h-screen">
          <section className="relative pt-20 pb-32 text-center">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-3 mb-6">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-kreoon-purple-500/60" />
                  <span className="text-xs uppercase tracking-[0.35em] text-kreoon-purple-400/80">
                    Próximamente
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-kreoon-purple-500/60" />
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                  Blog{" "}
                  <span className="bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-600 bg-clip-text text-transparent">
                    Kreoon
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-kreoon-text-secondary max-w-2xl mx-auto mb-12">
                  Estamos preparando contenido increíble sobre creación de contenido,
                  marketing digital, UGC y tendencias de la industria.
                </p>

                <div className="flex flex-col items-center gap-8">
                  <div className="flex items-center gap-4 px-6 py-4 rounded-xl border border-kreoon-purple-500/20 bg-kreoon-bg-card/50 backdrop-blur-sm">
                    <div className="h-12 w-12 rounded-full bg-kreoon-purple-500/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-kreoon-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">Muy pronto</p>
                      <p className="text-xs text-kreoon-text-muted">
                        Artículos, guías y recursos para creadores
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8">
                    {[
                      {
                        title: "Guías de UGC",
                        desc: "Aprende a crear contenido que convierte",
                      },
                      {
                        title: "Tendencias",
                        desc: "Lo último en marketing de contenido",
                      },
                      {
                        title: "Casos de éxito",
                        desc: "Historias de nuestra comunidad",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:border-kreoon-purple-500/30 transition-colors"
                      >
                        <FileText className="h-8 w-8 text-kreoon-purple-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-kreoon-text-muted">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleOpenAuth("register")}
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-kreoon-purple-600 hover:bg-kreoon-purple-500 text-white font-medium transition-colors"
                  >
                    Únete y sé el primero en saber
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </LandingLayout>

      <AuthModal
        open={authModal.open}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        initialTab={authModal.tab}
      />
    </>
  );
}
