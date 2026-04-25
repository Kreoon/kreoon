import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Sparkles, Briefcase, ChevronRight, Zap, Target, BarChart3 } from "lucide-react";

const ROLES = [
  {
    id: "brands",
    title: "Marcas",
    subtitle: "Escala tu contenido con precisión",
    icon: Building2,
    color: "from-blue-600 to-indigo-600",
    features: [
      { title: "AI Research", desc: "ADN de producto para guiones que convierten.", icon: Sparkles },
      { title: "Gestión de Campañas", desc: "Control total sobre cientos de piezas UGC.", icon: Target },
      { title: "ROI Analytics", desc: "Métricas de rendimiento en tiempo real.", icon: BarChart3 },
    ],
    cta: "Empieza a Escalar",
    image: "https://images.unsplash.com/photo-1664575602554-2087b04935a5?q=80&w=600&h=400&auto=format&fit=crop"
  },
  {
    id: "talent",
    title: "Talento",
    subtitle: "Tu carrera creativa, en esteroides",
    icon: Zap,
    color: "from-purple-600 to-pink-600",
    features: [
      { title: "Creative OS", desc: "Herramientas pro para gestionar tus ediciones.", icon: Sparkles },
      { title: "Marcas Globales", desc: "Trabaja con las empresas más grandes de LATAM.", icon: Briefcase },
      { title: "Pagos Seguros", desc: "Sistema automatizado de facturación y cobro.", icon: Zap },
    ],
    cta: "Unirse como Creador",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=600&h=400&auto=format&fit=crop"
  },
  {
    id: "agencies",
    title: "Agencias",
    subtitle: "El motor para tu operación masiva",
    icon: Briefcase,
    color: "from-emerald-600 to-teal-600",
    features: [
      { title: "Multi-Team Control", desc: "Gestiona múltiples equipos y clientes.", icon: Building2 },
      { title: "Workflow Automation", desc: "Optimiza cada paso de la producción.", icon: Zap },
      { title: "Dashboard Agencia", desc: "Vista consolidada de toda tu facturación.", icon: BarChart3 },
    ],
    cta: "Plan para Agencias",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&h=400&auto=format&fit=crop"
  }
];

export function SolutionRolesSection() {
  const [activeTab, setActiveTab] = useState(ROLES[0]);

  return (
    <section className="relative bg-kreoon-bg-primary py-32 overflow-hidden border-t border-white/5">
      <div className="container relative z-10 px-4">
        <div className="max-w-3xl mb-20">
          <h2 className="text-4xl font-bold text-white md:text-6xl mb-6">Un Ecosistema, <br/>Tres Soluciones.</h2>
          <p className="text-kreoon-text-secondary text-xl">
            Kreoon adapta su infraestructura para cada actor de la economía creativa. 
            Elige tu perfil y descubre tu nuevo sistema operativo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Tab Selection */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setActiveTab(role)}
                className={`group relative text-left p-6 rounded-sm border transition-all duration-300 backdrop-blur-md ${
                  activeTab.id === role.id
                    ? "bg-white/5 border-kreoon-purple-500/50 shadow-kreoon-glow-sm"
                    : "bg-transparent border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-sm bg-gradient-to-br ${role.color} bg-opacity-10`}>
                    <role.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{role.title}</h3>
                    <p className="text-sm text-kreoon-text-muted">{role.subtitle}</p>
                  </div>
                </div>
                {activeTab.id === role.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <ChevronRight className="h-5 w-5 text-kreoon-purple-400" />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          {/* Content Display */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white/[0.02] border border-white/5 rounded-sm p-8 md:p-12 backdrop-blur-xl shadow-2xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-8">Soluciones para {activeTab.title}</h3>
                    <div className="space-y-8">
                      {activeTab.features.map((feature, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="mt-1">
                            <feature.icon className="h-5 w-5 text-kreoon-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                            <p className="text-sm text-kreoon-text-secondary leading-relaxed">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="mt-12 flex items-center gap-2 px-8 py-4 bg-kreoon-purple-500 text-white font-bold rounded-sm hover:bg-kreoon-purple-600 transition-all shadow-kreoon-glow-sm">
                      {activeTab.cta}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <div className="aspect-[4/3] rounded-sm overflow-hidden border border-white/10">
                      <img 
                        src={activeTab.image} 
                        alt={activeTab.title} 
                        className="h-full w-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                      />
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-kreoon-purple-500/20 blur-2xl rounded-full" />
                    <div className="absolute -top-4 -left-4 h-24 w-24 bg-blue-500/10 blur-2xl rounded-full" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
