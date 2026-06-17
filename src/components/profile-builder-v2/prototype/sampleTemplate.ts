// Plantilla de ejemplo (autorada por dev a partir de HTML).
// En producción, cada plantilla viviría en BD; aquí va embebida para validar el motor.

export interface TemplateToken {
  key: string;
  label: string;
  type: "color" | "font";
  value: string;
}

// Tokens editables por el usuario final (color y tipografía del diseño).
export const TEMPLATE_TOKENS: TemplateToken[] = [
  {
    key: "--c-primary",
    label: "Primario (lavanda)",
    type: "color",
    value: "#d0bcff",
  },
  {
    key: "--c-secondary",
    label: "Cian claro",
    type: "color",
    value: "#aeecff",
  },
  {
    key: "--c-secondary-container",
    label: "Cian vibrante",
    type: "color",
    value: "#00d9ff",
  },
  { key: "--c-tertiary", label: "Rosa", type: "color", value: "#fface8" },
  {
    key: "--c-tertiary-container",
    label: "Magenta",
    type: "color",
    value: "#ff24e4",
  },
  { key: "--c-background", label: "Fondo", type: "color", value: "#15121b" },
  {
    key: "--font-display",
    label: "Fuente de títulos",
    type: "font",
    value: "Bricolage Grotesque",
  },
  {
    key: "--font-body",
    label: "Fuente de texto",
    type: "font",
    value: "Hanken Grotesk",
  },
];

// Mapa hex -> variable CSS (solo aparecen en el tailwind.config de la plantilla).
export const TOKEN_HEX_MAP: Record<string, string> = {
  "#d0bcff": "var(--c-primary)",
  "#aeecff": "var(--c-secondary)",
  "#00d9ff": "var(--c-secondary-container)",
  "#fface8": "var(--c-tertiary)",
  "#ff24e4": "var(--c-tertiary-container)",
  "#15121b": "var(--c-background)",
};

// Mapa fuente -> variable CSS (solo el config usa el nombre con espacios y comillas).
export const TOKEN_FONT_MAP: Record<string, string> = {
  "Bricolage Grotesque": "var(--font-display)",
  "Hanken Grotesk": "var(--font-body)",
};

// Fuentes ofrecidas en el selector (todas cargadas por la plantilla o seguras).
export const FONT_OPTIONS = [
  "Bricolage Grotesque",
  "Hanken Grotesk",
  "JetBrains Mono",
  "Inter",
  "Georgia",
];

export const SAMPLE_TEMPLATE_HTML = `<!DOCTYPE html>
<html class="dark" lang="es"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>KREOON | Creador de Contenido Premium</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Hanken+Grotesk:wght@400;500&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-variant": "#37333d",
                        "on-secondary-container": "#005b6c",
                        "on-secondary": "#003641",
                        "outline-variant": "#494454",
                        "secondary-fixed-dim": "#00d9ff",
                        "on-error": "#690005",
                        "on-surface-variant": "#cbc3d7",
                        "surface-container": "#211e27",
                        "secondary-fixed": "#aeecff",
                        "surface-container-low": "#1d1a23",
                        "tertiary": "#fface8",
                        "surface-container-lowest": "#0f0d15",
                        "secondary": "#aeecff",
                        "tertiary-container": "#ff24e4",
                        "on-tertiary": "#5e0053",
                        "tertiary-fixed-dim": "#fface8",
                        "on-secondary-fixed-variant": "#004e5d",
                        "inverse-primary": "#6d3bd7",
                        "surface-container-high": "#2c2832",
                        "on-tertiary-container": "#520049",
                        "inverse-surface": "#e7e0ed",
                        "surface": "#15121b",
                        "surface-tint": "#d0bcff",
                        "on-primary-container": "#340080",
                        "on-primary": "#3c0091",
                        "background": "#15121b",
                        "outline": "#958ea0",
                        "on-background": "#e7e0ed",
                        "surface-dim": "#15121b",
                        "error-container": "#93000a",
                        "surface-container-highest": "#37333d",
                        "on-tertiary-fixed": "#3a0033",
                        "on-surface": "#e7e0ed",
                        "secondary-container": "#00d9ff",
                        "inverse-on-surface": "#322f39",
                        "on-secondary-fixed": "#001f26",
                        "primary": "#d0bcff",
                        "tertiary-fixed": "#ffd7f0",
                        "primary-container": "#a078ff",
                        "surface-bright": "#3b3742",
                        "primary-fixed-dim": "#d0bcff",
                        "on-error-container": "#ffdad6",
                        "on-primary-fixed": "#23005c",
                        "on-tertiary-fixed-variant": "#840076",
                        "error": "#ffb4ab",
                        "primary-fixed": "#e9ddff",
                        "on-primary-fixed-variant": "#5516be"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "base": "8px",
                        "gutter": "24px",
                        "margin-mobile": "20px",
                        "container-max": "1440px",
                        "margin-desktop": "64px",
                        "section-gap": "120px"
                    },
                    "fontFamily": {
                        "label-mono": ["JetBrains Mono"],
                        "display-xl": ["Bricolage Grotesque"],
                        "stats-lg": ["JetBrains Mono"],
                        "headline-lg-mobile": ["Bricolage Grotesque"],
                        "headline-lg": ["Bricolage Grotesque"],
                        "body-md": ["Hanken Grotesk"]
                    },
                    "fontSize": {
                        "label-mono": ["12px", {"lineHeight": "16px", "letterSpacing": "0.1em", "fontWeight": "500"}],
                        "display-xl": ["80px", {"lineHeight": "90px", "letterSpacing": "0.05em", "fontWeight": "800"}],
                        "stats-lg": ["24px", {"lineHeight": "32px", "fontWeight": "700"}],
                        "headline-lg-mobile": ["32px", {"lineHeight": "38px", "letterSpacing": "0.03em", "fontWeight": "700"}],
                        "headline-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "0.03em", "fontWeight": "700"}],
                        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        body {
            background-color: #000000;
            color: #e7e0ed;
            overflow-x: hidden;
        }
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .neon-border-pulse { position: relative; z-index: 0; }
        .neon-border-pulse::after {
            content: '';
            position: absolute;
            top: -2px; left: -2px; right: -2px; bottom: -2px;
            background: linear-gradient(45deg, #d0bcff, #00d9ff, #ff24e4, #d0bcff);
            background-size: 400%;
            z-index: -1;
            filter: blur(8px);
            border-radius: inherit;
            animation: pulse-glow 8s linear infinite;
        }
        @keyframes pulse-glow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .fade-in { opacity: 0; transform: translateY(30px); transition: all 0.8s ease-out; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
        .marquee-container { overflow: hidden; user-select: none; display: flex; gap: 2rem; }
        .marquee-content { display: flex; gap: 2rem; animation: scroll 30s linear infinite; }
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .btn-glow:hover { box-shadow: 0 0 20px rgba(0, 217, 255, 0.4); }
    </style>
</head>
<body class="font-body-md">
<nav class="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(208,188,255,0.1)] transition-all duration-300 ease-in-out">
<div class="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
<span class="font-display-xl text-headline-lg text-primary tracking-tighter">KREOON</span>
<div class="hidden md:flex gap-8 items-center">
<a class="font-body-md text-primary border-b-2 border-primary pb-1" href="#">Sobre mí</a>
<a class="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Portafolio</a>
<a class="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Servicios</a>
<a class="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Precios</a>
<a class="font-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Contacto</a>
</div>
<button class="bg-primary text-on-primary px-6 py-2 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(208,188,255,0.3)]">Contratar</button>
</div>
</nav>
<section class="relative h-screen w-full overflow-hidden flex items-end">
<div class="absolute inset-0 z-[-1] pointer-events-none">
<img class="w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmGSCTp4ARDIlePxLgWnIu96y9M4CHWTU1eyBLrZOFOrm5WcjvK_5CsgcSJyGhJonnaIEPWFEpFDtH_CK6IIs-O9PAoR4AhGbSwVOwf_4cs8eNkq_j0v6CrvIYraOepKkqKt_7CiyWnPxdETFdgwstPeURqsm0gmHNi-DKZTrfuKb0FWyQtpSQe2dXzD_5jQGfY5Q_YIhrTXp8A9_Ikfa6S7v9Yhnrmld2XR0q9G9irSt_nCcAnHrND-Ztt8ejpp2rF82EA-7cAjs"/>
</div>
<div class="relative z-10 w-full max-w-container-max mx-auto px-margin-desktop pb-24 flex justify-between items-end">
<div class="glass p-8 rounded-3xl neon-border-pulse max-w-md fade-in">
<div class="flex items-center gap-6">
<div class="relative">
<div class="w-32 h-32 rounded-full border-4 border-primary p-1 overflow-hidden">
<img class="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZ4lJ03RZOlN5rlogFr4IEks1Pw1A0Sz6LL3VV4lJCgKZuN6LTlyg3xtuYdIFU8zIcFUUWTPRdHr3JL4-PNintdOSPdqncWzQeY_e62gdvgwJnUp68BMofSujsc1B9k-qq194VUq44nk_1Oxxjt63uK6PoyL92L4O4ZD_mec2taisa79bovJYcZnE-XcA3vvNfFyE1-zHsqNJclQBANNDp8r6ryVFyNfeF2u_WEaqHe7jJ19ND2sEtzUyGmDRdasJ7NTcawDEuyfg"/>
</div>
<div class="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-[#000] animate-pulse"></div>
</div>
<div>
<h1 class="font-display-xl text-5xl text-white">Mateo Kreoon</h1>
<p class="font-label-mono text-secondary">@mateokreoon</p>
<div class="flex items-center gap-2 mt-2">
<span class="material-symbols-outlined text-secondary" style="font-size: 18px;">location_on</span>
<span class="text-on-surface-variant">🌍 Medellín, Colombia</span>
</div>
<span class="inline-block mt-4 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30">Disponible para Proyectos</span>
</div>
</div>
</div>
</div>
</section>
<section class="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div class="grid md:grid-cols-2 gap-24 items-center">
<div class="fade-in">
<p class="font-label-mono text-secondary mb-4 uppercase tracking-[0.3em]">SOBRE MÍ</p>
<h2 class="font-headline-lg text-white mb-8 leading-tight">Elevando marcas a través de narrativas digitales.</h2>
<div class="flex gap-4 mb-10">
<span class="glass px-6 py-2 rounded-full font-label-mono text-white text-sm">#CREATIVO</span>
<span class="glass px-6 py-2 rounded-full font-label-mono text-white text-sm">#STORYTELLER</span>
</div>
<p class="text-on-surface-variant text-lg leading-relaxed max-w-xl">Soy un creador de contenido obsesionado con el impacto visual y la conversión. Mi enfoque fusiona el arte cinematográfico con estrategias de marketing directo para crear piezas que no solo se ven bien, sino que generan resultados reales.</p>
</div>
<div class="fade-in delay-200">
<p class="font-label-mono text-secondary mb-6 uppercase tracking-[0.3em]">LO QUE ME APASIONA</p>
<div class="flex flex-wrap gap-4">
<div class="glass p-6 rounded-2xl flex items-center gap-4 hover:border-primary transition-all group">
<span class="material-symbols-outlined text-primary text-3xl">movie</span>
<div><p class="font-bold">🎬 Lifestyle</p><p class="text-xs text-on-surface-variant">Contenido orgánico y estético</p></div>
</div>
<div class="glass p-6 rounded-2xl flex items-center gap-4 hover:border-secondary transition-all group">
<span class="material-symbols-outlined text-secondary text-3xl">fastfood</span>
<div><p class="font-bold">🍔 Food &amp; Bev</p><p class="text-xs text-on-surface-variant">Sabor que se siente a través del video</p></div>
</div>
<div class="glass p-6 rounded-2xl flex items-center gap-4 hover:border-tertiary transition-all group">
<span class="material-symbols-outlined text-tertiary text-3xl">devices</span>
<div><p class="font-bold">💻 Tech Gear</p><p class="text-xs text-on-surface-variant">Reviews con estilo Cyber-Industrial</p></div>
</div>
</div>
</div>
</div>
</section>
<section class="py-section-gap bg-surface-container-lowest relative">
<div class="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
<div class="max-w-container-max mx-auto px-margin-desktop relative z-10">
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-primary text-4xl mb-2">500+</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Videos</p></div>
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-secondary text-4xl mb-2">4.9/5</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Rating</p></div>
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-tertiary text-4xl mb-2">120+</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Proyectos</p></div>
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-white text-4xl mb-2">3-5d</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Entrega</p></div>
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-secondary text-4xl mb-2">85%</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Recurrentes</p></div>
<div class="glass p-8 rounded-3xl text-center fade-in"><p class="font-stats-lg text-primary text-4xl mb-2">$20M+</p><p class="text-on-surface-variant text-xs font-label-mono uppercase">Inversión</p></div>
</div>
</div>
</section>
<section class="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div class="text-center mb-20 fade-in">
<h2 class="font-headline-lg text-white mb-4">Especialidades</h2>
<p class="text-on-surface-variant max-w-2xl mx-auto">Soluciones de contenido diseñadas para cada etapa de tu embudo de ventas.</p>
</div>
<div class="grid md:grid-cols-3 gap-8">
<div class="glass p-10 rounded-[2.5rem] border-primary/20 relative group hover:bg-white/5 transition-all fade-in">
<span class="material-symbols-outlined text-primary text-5xl mb-6">ads_click</span>
<h3 class="text-2xl font-bold mb-4">UGC Video Ads</h3>
<ul class="space-y-4 mb-8">
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-primary">check_circle</span>Direct Response</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-primary">check_circle</span>Hooks Ganchos</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-primary">check_circle</span>CTA Optimizado</li>
</ul>
</div>
<div class="glass p-10 rounded-[2.5rem] border-secondary/20 relative group hover:bg-white/5 transition-all fade-in delay-100">
<span class="material-symbols-outlined text-secondary text-5xl mb-6">reviews</span>
<h3 class="text-2xl font-bold mb-4">Product Reviews</h3>
<ul class="space-y-4 mb-8">
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-secondary">check_circle</span>Demo en Uso</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-secondary">check_circle</span>Unboxing Premium</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-secondary">check_circle</span>Voiceover Profesional</li>
</ul>
</div>
<div class="glass p-10 rounded-[2.5rem] border-tertiary/20 relative group hover:bg-white/5 transition-all fade-in delay-200">
<span class="material-symbols-outlined text-tertiary text-5xl mb-6">bolt</span>
<h3 class="text-2xl font-bold mb-4">Reels &amp; TikTok</h3>
<ul class="space-y-4 mb-8">
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-tertiary">check_circle</span>Edición Dinámica</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-tertiary">check_circle</span>Trend Adoption</li>
<li class="flex items-center gap-3 text-on-surface-variant"><span class="material-symbols-outlined text-tertiary">check_circle</span>Enganchamiento Viral</li>
</ul>
</div>
</div>
</section>
<section class="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
<div class="fade-in"><h2 class="font-headline-lg text-white">Mi Trabajo</h2><p class="text-on-surface-variant">Explora mis creaciones más recientes.</p></div>
<div class="flex gap-4 fade-in overflow-x-auto pb-2 w-full md:w-auto">
<button class="glass px-8 py-3 rounded-full text-primary border-primary font-bold">Todo</button>
<button class="glass px-8 py-3 rounded-full text-on-surface-variant hover:text-white">UGC Ads</button>
<button class="glass px-8 py-3 rounded-full text-on-surface-variant hover:text-white">Lifestyle</button>
<button class="glass px-8 py-3 rounded-full text-on-surface-variant hover:text-white">Tech</button>
</div>
</div>
<div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
<div class="col-span-1 row-span-2 relative group overflow-hidden rounded-3xl fade-in min-h-[300px]">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTFrO1mTuHxqx1J-a0SdvgjD-qwP9gnUg1s25QukWBwWiTVye21uoTy8M4NZAfgVetyAjwv7fbFp1QFYI5ejPm3XqT-ceZcYrVLgoWs1V9aH6BYW_4p3QaD77XIbLOIllS1B1lwrFOZ1JFx79fpgr2fEXpGx01VMB8dg0Mg8hIunW2kMh5HSrpcMoM04n8BvRuIV_Sqm9nNa2Pa0RIdiww0N5gcHWUj4EhuMHs2I9H0CvdxkfWFzBF4GU8aPunuz_NouLP5c_ehUo"/>
</div>
<div class="col-span-2 relative group overflow-hidden rounded-3xl fade-in delay-100 min-h-[200px]">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-FX-6ee2SUXbloLA6h7f0IYFCGrH1mqvt8wyA9x_k5_TiqaO0zvxnL-OrL-pV4mPfgk91yT_cODjS24abyHm1cSxMsyyzDRZ1i73Y3RAoD_lOBiVs4WaG_b_bdnqmiPA9zrTXM6_hoBsDS1FkuXZaeCE-7kio_hpa4zdMTL26Mpyc26CodVLU_sc4cMeLJeIm0cFKwuQia-3HJ3MQEZYr3naEVZKaZ2OkW7GawRgFdmIOD-xQfnne0RR5TqZYzRrS9Xi-i9K63iE"/>
</div>
<div class="col-span-1 row-span-2 relative group overflow-hidden rounded-3xl fade-in delay-200 min-h-[300px]">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPfm_uGRW1WbUsDWG5aSD5nfj87ttC8VkL2rZ_I-Diieo3pMSVQxJ8WspE2yzPtZUUXPVZ7fPfkbxcdjJx1-aBNgW2SSrBb0ihhirQE0_pEQhuiB5D5r1cW3MFd3xDbWJPgaQGWW-tB9dLeP9RMPiXClhXMEdU02wMDsLlp4VByI5hnbZ1riO0BnxIHuSnBBXU4EXOR8_u-Z9QxMhvez01ig-A88oiF55NDmd7hVLsC6rmwzwU3KhKsQcyGaoww3L_M4KqIVjqaEo"/>
</div>
<div class="col-span-2 relative group overflow-hidden rounded-3xl fade-in delay-300 min-h-[200px]">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyLW7qPXKqwZjHHpt9FO3F_yLiOGY0mqlh9Cw3hoJDN29otdVmS6UQmaiFid95rSxkxJozSoGaBfP3x_sl1lDn7Ff9EJquTcSMONiBQqz625uKzL3u6-xTPqpLFJ-xyXAAW7ffxLjwy9kd7hCHF2XEQOBu9Wg10uxFA1tZpxq8oZ9EsEw77uUmNW7XcRZpnUUm4EE6SenD7s6lQG7nmINgOqD8cvP0ZHz0hYPZi6kK4e-bHNXViSZwXzs4jnqASWLXOvqyVlESZP4"/>
</div>
</div>
</section>
<section class="py-section-gap overflow-hidden bg-surface-container-lowest">
<div class="marquee-container">
<div class="marquee-content">
<span class="text-4xl font-display-xl text-white/20 px-12">NIKE</span>
<span class="text-4xl font-display-xl text-white/20 px-12">APPLE</span>
<span class="text-4xl font-display-xl text-white/20 px-12">ADIDAS</span>
<span class="text-4xl font-display-xl text-white/20 px-12">NETFLIX</span>
<span class="text-4xl font-display-xl text-white/20 px-12">REDBULL</span>
<span class="text-4xl font-display-xl text-white/20 px-12">SONY</span>
<span class="text-4xl font-display-xl text-white/20 px-12">NIKE</span>
<span class="text-4xl font-display-xl text-white/20 px-12">APPLE</span>
<span class="text-4xl font-display-xl text-white/20 px-12">ADIDAS</span>
<span class="text-4xl font-display-xl text-white/20 px-12">NETFLIX</span>
<span class="text-4xl font-display-xl text-white/20 px-12">REDBULL</span>
<span class="text-4xl font-display-xl text-white/20 px-12">SONY</span>
</div>
</div>
<div class="max-w-container-max mx-auto px-margin-desktop mt-20 grid md:grid-cols-3 gap-8">
<div class="glass p-8 rounded-3xl border-l-4 border-primary fade-in">
<div class="flex justify-between items-start mb-6"><div class="bg-white/10 p-3 rounded-xl"><span class="material-symbols-outlined text-primary">monitoring</span></div><span class="text-primary font-bold text-2xl">+340% CTR</span></div>
<p class="text-on-surface-variant">Campaña de lanzamiento para una App de Fintech con contenido dinámico y hooks agresivos.</p>
</div>
<div class="glass p-8 rounded-3xl border-l-4 border-secondary fade-in delay-100">
<div class="flex justify-between items-start mb-6"><div class="bg-white/10 p-3 rounded-xl"><span class="material-symbols-outlined text-secondary">trending_up</span></div><span class="text-secondary font-bold text-2xl">2M+ Views</span></div>
<p class="text-on-surface-variant">Estrategia orgánica para marca de suplementos deportivos, logrando viralidad en Reels.</p>
</div>
<div class="glass p-8 rounded-3xl border-l-4 border-tertiary fade-in delay-200">
<div class="flex justify-between items-start mb-6"><div class="bg-white/10 p-3 rounded-xl"><span class="material-symbols-outlined text-tertiary">shopping_cart</span></div><span class="text-tertiary font-bold text-2xl">ROAS 5.2x</span></div>
<p class="text-on-surface-variant">Optimizando el embudo de conversión para E-commerce de moda mediante reviews auténticas.</p>
</div>
</div>
</section>
<section class="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div class="text-center mb-16 fade-in"><h2 class="font-headline-lg text-white mb-4">Planes de Contenido</h2><p class="text-on-surface-variant">Invierte en contenido que genera retorno.</p></div>
<div class="grid md:grid-cols-3 gap-8 items-center">
<div class="glass p-10 rounded-[2.5rem] fade-in">
<h3 class="text-xl mb-4">Starter Pack</h3>
<p class="text-4xl font-display-xl mb-8">$299<span class="text-sm font-body-md text-on-surface-variant">/mes</span></p>
<ul class="space-y-4 mb-10 text-on-surface-variant">
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> 3 Videos UGC</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> Guiones Incluidos</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-primary text-sm">check</span> 1 Ronda de Cambios</li>
</ul>
<button class="w-full py-4 rounded-full border border-primary/30 hover:bg-primary/10 transition-colors font-bold">Comenzar Ahora</button>
</div>
<div class="glass p-12 rounded-[3rem] neon-border-pulse fade-in relative z-10 scale-105">
<div class="absolute top-0 right-10 -translate-y-1/2 bg-secondary text-on-secondary px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase">Popular</div>
<h3 class="text-2xl mb-4">Pro Growth</h3>
<p class="text-5xl font-display-xl mb-8">$749<span class="text-sm font-body-md text-on-surface-variant">/mes</span></p>
<ul class="space-y-5 mb-10 text-white">
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary">check_circle</span> 8 Videos Premium</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary">check_circle</span> 2 Versiones de Hook x Video</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary">check_circle</span> Soporte Prioritario</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-secondary">check_circle</span> Estrategia de Tendencias</li>
</ul>
<button class="w-full py-4 rounded-full bg-secondary text-on-secondary font-bold btn-glow transition-all">Elegir Pro</button>
</div>
<div class="glass p-10 rounded-[2.5rem] fade-in">
<h3 class="text-xl mb-4">Elite Scale</h3>
<p class="text-4xl font-display-xl mb-8">$1,499<span class="text-sm font-body-md text-on-surface-variant">/mes</span></p>
<ul class="space-y-4 mb-10 text-on-surface-variant">
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-tertiary text-sm">check</span> 20 Videos Mensuales</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-tertiary text-sm">check</span> Edición Cinematográfica</li>
<li class="flex items-center gap-3"><span class="material-symbols-outlined text-tertiary text-sm">check</span> Consultoría de Ads</li>
</ul>
<button class="w-full py-4 rounded-full border border-tertiary/30 hover:bg-tertiary/10 transition-colors font-bold">Contactar Ventas</button>
</div>
</div>
</section>
<section class="py-section-gap px-margin-desktop max-w-container-max mx-auto">
<div class="flex items-center gap-4 mb-16 fade-in"><h2 class="font-headline-lg text-white">Reputación</h2><div class="bg-primary/20 border border-primary/30 px-6 py-2 rounded-full flex items-center gap-2"><span class="material-symbols-outlined text-primary">stars</span><span class="font-bold text-primary">Master Level</span></div></div>
<div class="grid md:grid-cols-3 gap-8">
<div class="glass p-8 rounded-3xl fade-in"><p class="text-lg italic mb-8">"Trabajar con Mateo cambió nuestra forma de ver los Ads. Los resultados fueron inmediatos."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-surface-variant"></div><div><p class="font-bold">Carlos Ruiz</p><p class="text-xs text-on-surface-variant">CEO, TechStore</p></div></div></div>
<div class="glass p-8 rounded-3xl fade-in delay-100"><p class="text-lg italic mb-8">"Su capacidad para capturar la esencia de la marca en segundos es impresionante. Altamente recomendado."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-surface-variant"></div><div><p class="font-bold">Laura Mendez</p><p class="text-xs text-on-surface-variant">Marketing Director, Glamify</p></div></div></div>
<div class="glass p-8 rounded-3xl fade-in delay-200"><p class="text-lg italic mb-8">"La calidad de video y la atención al detalle es de otro nivel. Un verdadero profesional."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-surface-variant"></div><div><p class="font-bold">Juan Pablo S.</p><p class="text-xs text-on-surface-variant">Founder, FitLife App</p></div></div></div>
</div>
</section>
<section class="py-section-gap relative overflow-hidden bg-black">
<div class="max-w-container-max mx-auto px-margin-desktop relative z-10">
<div class="grid lg:grid-cols-2 gap-20 items-center">
<div class="fade-in">
<h2 class="font-display-xl text-6xl text-white mb-8">¿Listo para crear contenido que convierte?</h2>
<p class="text-on-surface-variant text-xl mb-12 max-w-lg">Transformemos tu marca hoy. Completa el formulario y me pondré en contacto contigo en menos de 24 horas.</p>
<div class="flex flex-col sm:flex-row gap-6">
<button class="bg-primary text-on-primary px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition-all">Contratar ahora</button>
<button class="glass border-secondary/50 text-secondary px-10 py-5 rounded-full font-bold text-lg hover:bg-secondary/10 transition-all">Enviar mensaje</button>
</div>
</div>
<div class="glass p-12 rounded-[3rem] border-white/5 fade-in delay-200">
<form class="space-y-6">
<div><label class="block text-sm font-label-mono text-secondary mb-2 uppercase">Nombre Completo</label><input class="w-full bg-black border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Tu nombre..." type="text"/></div>
<div><label class="block text-sm font-label-mono text-secondary mb-2 uppercase">Marca / Empresa</label><input class="w-full bg-black border-white/10 rounded-2xl px-6 py-4 text-white" placeholder="Nombre de tu marca..." type="text"/></div>
<div><label class="block text-sm font-label-mono text-secondary mb-2 uppercase">Presupuesto Estimado</label><select class="w-full bg-black border-white/10 rounded-2xl px-6 py-4 text-white appearance-none"><option>$500 - $1,500 USD</option><option>$1,500 - $3,000 USD</option><option>$3,000+ USD</option></select></div>
<button class="w-full bg-white text-black py-5 rounded-2xl font-bold text-lg hover:bg-primary transition-all" type="submit">Enviar Solicitud</button>
</form>
</div>
</div>
</div>
</section>
<footer class="bg-surface-container-lowest border-t border-outline-variant/30 w-full py-section-gap">
<div class="flex flex-col md:flex-row justify-between items-center px-margin-desktop gap-8 max-w-container-max mx-auto">
<span class="font-display-xl text-headline-lg text-primary">KREOON</span>
<p class="font-body-md text-on-surface-variant">© 2024 KREOON. Creado para el futuro digital.</p>
<div class="flex gap-8">
<a class="text-on-surface-variant hover:text-tertiary transition-colors" href="#">Privacidad</a>
<a class="text-on-surface-variant hover:text-tertiary transition-colors" href="#">Términos</a>
<a class="text-on-surface-variant hover:text-tertiary transition-colors" href="#">Instagram</a>
<a class="text-on-surface-variant hover:text-tertiary transition-colors" href="#">LinkedIn</a>
</div>
</div>
</footer>
</body></html>`;
