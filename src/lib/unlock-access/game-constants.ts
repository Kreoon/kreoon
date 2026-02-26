// ═══════════════════════════════════════════════════════════════════════
// GAME CONSTANTS - Las Llaves del Reino
// ═══════════════════════════════════════════════════════════════════════

export const GAME_CONFIG = {
  deadline: new Date('2025-04-30T23:59:59-05:00'),
  maxFounders: 500,
  packageValue: 497,
} as const;

export const HERO_LEVELS = {
  0: { name: 'Aspirante', color: 'gray', icon: '🌱', borderColor: 'border-gray-500' },
  1: { name: 'Guardian', color: 'bronze', icon: '🛡️', borderColor: 'border-amber-600' },
  2: { name: 'Campeon', color: 'silver', icon: '⚔️', borderColor: 'border-slate-400' },
  3: { name: 'Fundador', color: 'gold', icon: '👑', borderColor: 'border-yellow-400' },
} as const;

export type HeroLevel = keyof typeof HERO_LEVELS;

export const LEGENDARY_KEYS = [
  {
    id: 1,
    name: 'Llave del Acceso',
    subtitle: 'Abre las puertas del reino',
    icon: '🗝️',
    color: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    shadowColor: 'shadow-amber-500/30',
    rewards: [
      { icon: '⭐', text: '3 meses Plan Creador Pro', value: '$45 USD' },
      { icon: '👑', text: 'Badge "Fundador 2025"', value: 'Exclusivo' },
      { icon: '🎯', text: 'Acceso prioritario campanas', value: 'VIP' },
    ],
  },
  {
    id: 2,
    name: 'Llave del Saber',
    subtitle: 'Desbloquea el conocimiento ancestral',
    icon: '📚',
    color: 'from-purple-400 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    shadowColor: 'shadow-purple-500/30',
    rewards: [
      { icon: '🎓', text: '1 mes "Los Reyes del Contenido"', value: '$97 USD' },
      { icon: '🏕️', text: 'Bootcamp exclusivo fundadores', value: 'Live' },
      { icon: '📜', text: 'Certificacion Creador Verificado', value: 'Oficial' },
    ],
  },
  {
    id: 3,
    name: 'Llave del Poder',
    subtitle: 'Otorga ventajas perpetuas',
    icon: '⚡',
    color: 'from-emerald-400 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'rgba(52, 211, 153, 0.5)',
    shadowColor: 'shadow-emerald-500/30',
    rewards: [
      { icon: '🤖', text: '200 tokens IA creativos', value: '$20 USD' },
      { icon: '💰', text: 'Comision 25% PERPETUA', value: '+5%' },
      { icon: '🏆', text: 'Top 500 ranking antiguedad', value: 'Permanente' },
      { icon: '🚀', text: 'Acceso VIP marcas premium', value: '∞' },
    ],
  },
] as const;

export type LegendaryKey = typeof LEGENDARY_KEYS[number];

export const KIRO_DIALOGUES = {
  welcome: [
    "Bienvenido, heroe. Soy KIRO, tu guia en esta aventura.",
    "Ante ti se alza la Puerta del Reino de KREOON...",
    "Solo los verdaderos Fundadores pueden entrar antes del Gran Dia.",
    "Consigue 3 Guardianes leales y las llaves seran tuyas.",
  ],
  progress: {
    0: [
      "El viaje de mil millas comienza con un solo paso... o en tu caso, con un mensaje a un amigo.",
      "Ves esas llaves? Cada una esta custodiada por un Guardian. Invoca al primero.",
      "El 30 de Abril las puertas se abriran para TODOS. Quieres ser uno mas del monton?",
      "Los tesoros del cofre valen $497... y pueden ser tuyos GRATIS. Solo necesitas 3 amigos.",
    ],
    1: [
      "Tu primer Guardian! La Llave del Acceso es tuya.",
      "Faltan 2 llaves. El Reino esta mas cerca de lo que crees.",
      "Tu Guardian ya esta preparandose para crear contenido. Y los otros dos?",
      "Mientras dudas, otros heroes completan su mision. El tiempo no espera.",
    ],
    2: [
      "DOS llaves! Estas a UN Guardian de la gloria.",
      "Puedo ver el brillo del cofre... esta a punto de abrirse.",
      "La Llave del Poder te espera. Con ella, tu comision sera del 25% PARA SIEMPRE.",
      "Un mensaje. Eso es todo lo que te separa del titulo de Fundador.",
    ],
    3: [
      "LO LOGRASTE, FUNDADOR! El Reino es tuyo.",
      "Has demostrado tu valor. Bienvenido a la elite de KREOON.",
      "Mientras otros esperan hasta abril, tu ya estas dentro. Bien jugado.",
      "Ahora ve y conquista. Las mejores campanas te esperan.",
    ],
  },
  tips: [
    "Tip: Comparte en tus historias de Instagram. Tus seguidores son creadores potenciales.",
    "Tip: Los grupos de WhatsApp de creadores son oro puro. Comparte ahi.",
    "Tip: Menciona que es GRATIS registrarse. Eso elimina objeciones.",
    "Tip: El FOMO es real. Diles que despues del 30 de abril pierden los beneficios.",
  ],
  urgency: {
    critical: "ALERTA! Quedan menos de 7 dias. El tiempo se agota, heroe.",
    high: "Menos de 2 semanas. Los Fundadores mas rapidos ya estan dentro.",
    normal: "Aun tienes tiempo, pero no lo desperdicies. Los cupos se agotan.",
  },
} as const;

export const GAME_SHARE_MESSAGES = {
  casual: {
    label: 'Casual',
    emoji: '🎮',
    text: "Hey! Encontre una plataforma para ganar dinero creando contenido. Si te registras con mi link, ambos desbloqueamos beneficios de Fundador (valen $497). Es gratis:",
  },
  urgent: {
    label: 'Urgente',
    emoji: '🔥',
    text: "Parce, esto cierra el 30 de abril. Despues perdemos los beneficios de Fundador para siempre. Registrate gratis con mi link:",
  },
  gamer: {
    label: 'Gamer',
    emoji: '⚔️',
    text: "Necesito 3 'guardianes' para desbloquear el cofre legendario de KREOON. Me ayudas? Es gratis y ganas beneficios:",
  },
} as const;

export const ACHIEVEMENTS = {
  firstGuardian: {
    id: 'first_guardian',
    title: 'Primer Paso!',
    description: 'Invocaste a tu primer Guardian',
    icon: '🛡️',
    xp: 100,
  },
  secondGuardian: {
    id: 'second_guardian',
    title: 'El Camino del Heroe',
    description: 'Dos Guardianes luchan a tu lado',
    icon: '⚔️',
    xp: 200,
  },
  founder: {
    id: 'founder',
    title: 'FUNDADOR DE KREOON!',
    description: 'Has demostrado tu valor. El Reino es tuyo.',
    icon: '👑',
    xp: 500,
    legendary: true,
  },
} as const;

export const FOMO_MESSAGES = [
  { icon: '⚔️', text: 'El 30 de Abril las puertas se abren para TODOS' },
  { icon: '👥', text: 'Miles de creadores competiran por las mismas campanas' },
  { icon: '💨', text: 'Tu ventaja de Fundador desaparecera en la niebla' },
  { icon: '💸', text: 'El dinero que pudiste ganar... sera de otros' },
  { icon: '🏃', text: 'Los que entren despues empezaran desde CERO' },
  { icon: '👑', text: 'El badge de Fundador 2025 NUNCA mas estara disponible' },
] as const;

export const GAME_FAQ_ITEMS = [
  {
    question: 'Que pasa si no consigo las 3 llaves?',
    answer: 'El 30 de Abril la plataforma abre para todos. Entraras como usuario regular: sin Plan Pro gratis, sin badge de Fundador, sin comision del 25%, sin posicion VIP. Empezaras igual que miles de creadores que nunca escucharon de esta oportunidad.',
  },
  {
    question: 'Los beneficios son reales?',
    answer: '100% reales. El Plan Creador Pro cuesta $15 USD/mes (3 meses = $45). La comunidad "Los Reyes del Contenido" costara $97 USD/mes. Los 200 tokens IA equivalen a $20 USD. La comision del 25% es 5% mas que el estandar, PARA SIEMPRE.',
  },
  {
    question: 'Mis Guardianes (referidos) ganan algo?',
    answer: 'Si! Ellos tambien pueden convertirse en Fundadores invitando a sus propios Guardianes. Es un sistema donde todos ganan.',
  },
  {
    question: 'Puedo invitar a cualquier persona?',
    answer: 'Deben ser creadores reales interesados en monetizar su contenido. Cuentas falsas o bots = pierdes tu estatus de Fundador.',
  },
  {
    question: 'El badge de Fundador 2025 es permanente?',
    answer: 'Para siempre. Es un simbolo de que estuviste ahi desde el inicio. Las marcas lo veran y sabran que eres un creador comprometido.',
  },
] as const;

export const TREASURE_CHEST_REWARDS = [
  { icon: '💰', title: 'Tesoro Fundador', value: '$497 USD en valor' },
  { icon: '👑', title: 'Titulo de Fundador', value: 'Badge permanente' },
  { icon: '⚔️', title: 'Armas IA', value: '200 tokens creativos' },
  { icon: '🏆', title: 'Salon de la Fama', value: 'Top 500 posicion' },
  { icon: '💎', title: 'Comision VIP', value: '25% perpetua' },
] as const;
