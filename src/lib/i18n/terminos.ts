/**
 * Diccionario oficial de términos LATAM para Kreoon
 *
 * Fuente única de verdad para toda la terminología visible al usuario.
 * Código en inglés — UI en español LATAM.
 *
 * Reglas:
 *   - Variables, funciones, tipos → siguen en inglés (código)
 *   - Labels, botones, mensajes, tooltips, placeholders → español LATAM
 *   - Marca y términos técnicos universales → se mantienen tal cual
 *
 * Términos intocables: KREOON, KIRO, UP Points, KAE, CRM, Dashboard,
 * ADN Recargado, Método CAST, ESFERA, Marketplace, TikTok, Meta,
 * Stripe, Bunny CDN, WhatsApp, Instagram, YouTube
 */

// ─── NAVEGACIÓN PRINCIPAL ─────────────────────────────────────────────
export const NAV = {
  inicio:          'Inicio',
  tablero:         'Tablero',
  contenido:       'Contenido',
  clientes:        'Clientes',
  marketing:       'Marketing',
  mercado:         'Mercado',
  transmision:     'Transmisión en Vivo',
  configuracion:   'Configuración',
  perfil:          'Mi Perfil',
  salir:           'Cerrar Sesión',
  notificaciones:  'Notificaciones',
  buscar:          'Buscar',
  ayuda:           'Ayuda',
  soporte:         'Soporte',
  volver:          'Volver',
  inicio_sesion:   'Iniciar Sesión',
  registro:        'Crear Cuenta',
} as const;

// ─── ROLES Y PERFILES (HÍBRIDO: 7 base + marketplace) ─────────────────
export const ROLES = {
  // ─── 7 ROLES BASE (sistema actual del código) ───────────────────────
  admin:                 'Administrador',
  content_creator:       'Creador de Contenido',
  editor:                'Editor y Producción',
  digital_strategist:    'Estratega Digital',
  creative_strategist:   'Estratega Creativo',
  community_manager:     'Community Manager',
  client:                'Cliente / Marca',

  // ─── ROL GLOBAL ESTUDIANTE (acceso solo a Academia) ─────────────────
  student:               'Estudiante',

  // ─── ROLES LEGACY (backward compatibility) ──────────────────────────
  team_leader:           'Líder de Equipo',
  strategist:            'Estratega',
  trafficker:            'Trafficker',
  creator:               'Creador de Contenido',
  developer:             'Desarrollador',
  educator:              'Educador',
  ambassador:            'Embajador',

  // ─── ROLES DE MARKETPLACE (especializaciones) ───────────────────────
  ugc_creator:           'Creador UGC',
  lifestyle_creator:     'Creador Lifestyle',
  micro_influencer:      'Micro Influencer',
  nano_influencer:       'Nano Influencer',
  macro_influencer:      'Macro Influencer',
  brand_ambassador:      'Embajador de Marca',
  live_streamer:         'Streamer en Vivo',
  podcast_host:          'Host de Podcast',
  photographer:          'Fotógrafo',
  copywriter:            'Copywriter',
  graphic_designer:      'Diseñador Gráfico',
  voice_artist:          'Locutor / Voz en Off',
  video_editor:          'Editor de Video',
  motion_graphics:       'Motion Graphics',
  sound_designer:        'Diseñador de Sonido',
  colorist:              'Colorista',
  director:              'Director Creativo',
  producer:              'Productor Audiovisual',
  animator_2d3d:         'Animador 2D/3D',
  content_strategist:    'Estratega de Contenido',
  social_media_manager:  'Social Media Manager',
  seo_specialist:        'Especialista SEO',
  email_marketer:        'Email Marketer',
  growth_hacker:         'Growth Hacker',
  crm_specialist:        'Especialista CRM',
  conversion_optimizer:  'Optimizador de Conversión',
  web_developer:         'Desarrollador Web',
  app_developer:         'Desarrollador de Apps',
  ai_specialist:         'Especialista en IA',
  online_instructor:     'Instructor Online',
  workshop_facilitator:  'Facilitador de Talleres',
  brand_manager:         'Gerente de Marca',
  marketing_director:    'Director de Marketing',
} as const;

// ─── BADGES / EMBAJADORES ─────────────────────────────────────────────
export const BADGES = {
  bronze: 'Embajador Bronce',
  silver: 'Embajador Plata',
  gold:   'Embajador Oro',
} as const;

// ─── ESTADOS DEL TABLERO DE CONTENIDO ────────────────────────────────
export const ESTADOS_CONTENIDO = {
  draft:           'Borrador',
  script_pending:  'Guión Pendiente',
  script_approved: 'Guión Aprobado',
  assigned:        'Asignado',
  recording:       'En Grabación',
  recorded:        'Grabado',
  editing:         'En Edición',
  delivered:       'Entregado',
  corrected:       'Corregido',
  review:          'En Revisión',
  approved:        'Aprobado',
  paid:            'Pagado',
  published:       'Publicado',
  cancelled:       'Cancelado',
  paused:          'Pausado',
} as const;

// ─── ACCIONES COMUNES ─────────────────────────────────────────────────
export const ACCIONES = {
  guardar:          'Guardar',
  cancelar:         'Cancelar',
  eliminar:         'Eliminar',
  editar:           'Editar',
  crear:            'Crear',
  agregar:          'Agregar',
  ver:              'Ver',
  ver_detalle:      'Ver Detalle',
  descargar:        'Descargar',
  subir:            'Subir',
  buscar:           'Buscar',
  filtrar:          'Filtrar',
  limpiar:          'Limpiar Filtros',
  confirmar:        'Confirmar',
  aceptar:          'Aceptar',
  rechazar:         'Rechazar',
  enviar:           'Enviar',
  publicar:         'Publicar',
  archivar:         'Archivar',
  restaurar:        'Restaurar',
  copiar:           'Copiar',
  compartir:        'Compartir',
  aplicar:          'Aplicar',
  continuar:        'Continuar',
  finalizar:        'Finalizar',
  siguiente:        'Siguiente',
  anterior:         'Anterior',
  cerrar:           'Cerrar',
  abrir:            'Abrir',
  activar:          'Activar',
  desactivar:       'Desactivar',
  cargar_mas:       'Cargar más',
  reintentar:       'Reintentar',
  asignar:          'Asignar',
  cambiar:          'Cambiar',
  actualizar:       'Actualizar',
  generar:          'Generar',
  analizar:         'Analizar',
  exportar:         'Exportar',
  importar:         'Importar',
  conectar:         'Conectar',
  desconectar:      'Desconectar',
  invitar:          'Invitar',
  remover:          'Remover',
  aprobar:          'Aprobar',
  solicitar:        'Solicitar',
  contratar:        'Contratar',
  postular:         'Postularse',
} as const;

// ─── MÓDULOS / SECCIONES ──────────────────────────────────────────────
export const MODULOS = {
  // Gestión de contenido
  tablero_kanban:      'Tablero de Producción',
  brief:               'Brief',
  guion:               'Guión',
  entregable:          'Entregable',
  produccion:          'Producción',
  revision:            'Revisión',
  aprobacion:          'Aprobación',

  // Investigación y estrategia
  investigacion:       'Investigación de Mercado',
  adn_recargado:       'ADN Recargado',
  metodo_cast:         'Método CAST™',
  investigacion_ia:    'Análisis con IA',
  inteligencia_comp:   'Inteligencia Competitiva',

  // Personas
  equipo:              'Mi Equipo',
  talento:             'Talento',
  creadores:           'Creadores',
  clientes_seccion:    'Clientes',
  marcas:              'Marcas',
  contactos:           'Contactos',

  aplicaciones:        'Postulaciones',
  proyecto:            'Proyecto',
  proyectos:           'Proyectos',
  entrega:             'Entrega',

  // Finanzas
  billetera:           'Billetera',
  saldo:               'Saldo Disponible',
  retiro:              'Retirar Fondos',
  historial_pagos:     'Historial de Pagos',
  suscripcion:         'Suscripción',
  tokens_ia:           'Tokens de IA',
  comprar_tokens:      'Comprar Tokens',
  escrow:              'Fondos en Garantía',
  comision:            'Comisión',
  pago:                'Pago',
  pagos:               'Pagos',
  referidos:           'Programa de Referidos',
  ganancias:           'Mis Ganancias',
  factura:             'Factura',
  retiro_fondos:       'Solicitar Retiro',

  // Marketing
  calendario:          'Calendario de Contenido',
  parrilla:            'Parrilla de Publicaciones',
  anuncios:            'Anuncios',
  metricas:            'Métricas',
  estadisticas:        'Estadísticas',
  rendimiento:         'Rendimiento',
  conversion:          'Conversión',
  alcance:             'Alcance',
  impresiones:         'Impresiones',

  // Configuración
  ajustes_cuenta:      'Ajustes de Cuenta',
  ajustes_org:         'Ajustes de la Organización',
  permisos:            'Permisos',
  integraciones:       'Integraciones',
  planes:              'Planes y Precios',
  facturacion:         'Facturación',
  seguridad:           'Seguridad',
  notificaciones_conf: 'Notificaciones',
  apariencia:          'Apariencia',
  idioma:              'Idioma y Región',
} as const;

// ─── MENSAJES DE ESTADO ───────────────────────────────────────────────
export const MENSAJES = {
  // Carga
  cargando:            'Cargando...',
  procesando:          'Procesando...',
  guardando:           'Guardando...',
  subiendo:            'Subiendo archivo...',
  generando:           'Generando con IA...',
  analizando:          'Analizando...',

  // Éxito
  guardado_ok:         '¡Guardado correctamente!',
  creado_ok:           '¡Creado con éxito!',
  eliminado_ok:        'Eliminado correctamente.',
  enviado_ok:          '¡Enviado con éxito!',
  actualizado_ok:      '¡Actualizado correctamente!',
  copiado_ok:          '¡Copiado al portapapeles!',
  aprobado_ok:         '¡Aprobado correctamente!',
  publicado_ok:        '¡Publicado con éxito!',
  conectado_ok:        '¡Conectado correctamente!',
  cambios_guardados:   '¡Cambios guardados!',

  // Error
  error_generico:      'Algo salió mal. Inténtalo de nuevo.',
  error_red:           'Sin conexión a internet. Verifica tu red.',
  error_permisos:      'No tienes permiso para realizar esta acción.',
  error_sesion:        'Tu sesión expiró. Inicia sesión nuevamente.',
  error_archivo:       'Error al procesar el archivo.',
  error_tamano:        'El archivo es demasiado grande.',
  error_formato:       'Formato de archivo no soportado.',
  error_requerido:     'Este campo es obligatorio.',
  error_email:         'Ingresa un correo electrónico válido.',
  error_contrasena:    'La contraseña debe tener al menos 8 caracteres.',
  sin_resultados:      'No se encontraron resultados.',
  sin_datos:           'Aún no hay información disponible.',

  // Confirmaciones
  confirmar_eliminar:  '¿Seguro que quieres eliminar esto? Esta acción no se puede deshacer.',
  confirmar_salir:     '¿Quieres salir sin guardar los cambios?',
  confirmar_accion:    '¿Confirmas esta acción?',

  // Vacíos
  lista_vacia:         'Aún no hay nada aquí.',
  primera_vez:         '¡Comienza creando tu primer elemento!',
  sin_contenido:       'No hay contenido en producción.',
  sin_clientes:        'Aún no tienes clientes registrados.',
  sin_notificaciones:  'Estás al día. Sin notificaciones nuevas.',

  // Tokens IA
  tokens_insuficientes:   'No tienes tokens suficientes para esta acción.',
  tokens_agotados:        '¡Se agotaron tus tokens de IA! Compra más para continuar.',
  tokens_comprar:         'Comprar tokens de IA',
  tokens_saldo:           'Tu saldo actual',
  tokens_consumo:         'Esta acción consume',
  tokens_unidad:          'tokens',

  // Scraping / Inteligencia Competitiva
  scraping_inicio:     'Analizando el mercado en tiempo real...',
  scraping_listo:      '¡Inteligencia competitiva lista!',
  scraping_parcial:    'Análisis parcial. Algunos datos no disponibles.',
  scraping_omitido:    'Análisis estándar (sin scraping de mercado).',

  // ADN Recargado
  adn_generando:       'Generando tu estrategia de 360°...',
  adn_tab_lista:       '¡Lista!',
  adn_completo:        '¡Tu ADN Recargado está completo!',
  adn_error:           'Error al generar el análisis. Inténtalo de nuevo.',
} as const;

// ─── PLACEHOLDERS ─────────────────────────────────────────────────────
export const PLACEHOLDERS = {
  buscar:              'Buscar...',
  buscar_cliente:      'Buscar cliente...',
  buscar_creador:      'Buscar creador...',
  nombre:              'Escribe el nombre...',
  descripcion:         'Escribe una descripción...',
  email:               'correo@ejemplo.com',
  contrasena:          'Mínimo 8 caracteres',
  telefono:            '+57 300 000 0000',
  url:                 'https://...',
  precio:              '0.00',
  notas:               'Agrega notas adicionales...',
  mensaje:             'Escribe tu mensaje...',
  etiquetas:           'Agrega etiquetas...',
  seleccionar:         'Selecciona una opción...',
  fecha:               'DD/MM/AAAA',
  nit:                 'NIT o RUT de la empresa',
  ciudad:              'Ciudad...',
  pais:                'País...',
} as const;

// ─── TOOLTIPS FRECUENTES ──────────────────────────────────────────────
export const TOOLTIPS = {
  copiar:              'Copiar al portapapeles',
  eliminar:            'Eliminar permanentemente',
  editar:              'Editar',
  ver_mas:             'Ver más detalles',
  descargar:           'Descargar archivo',
  compartir:           'Compartir enlace',
  favorito:            'Marcar como favorito',
  notificacion:        'Tienes notificaciones nuevas',
  ayuda:               'Obtener ayuda sobre esta función',
  info:                'Más información',
  requerido:           'Este campo es obligatorio',
  ia_powered:          'Potenciado por IA',
  metodo_cast:         'Analizado con el Método CAST™ de Alexander Cast',
  tokens_info:         'Los tokens de IA se usan para las funciones inteligentes de la plataforma',
  escrow_info:         'Los fondos se liberan cuando apruebas la entrega del trabajo',
  up_points_info:      'UP Points — tu reputación en la plataforma',
} as const;

// ─── CATEGORÍAS DE MARKETPLACE ────────────────────────────────────────
export const CATEGORIAS_MERCADO = {
  content_creation:    'Creación de Contenido',
  post_production:     'Post-Producción',
  strategy_marketing:  'Estrategia y Marketing',
  technology:          'Tecnología',
  education:           'Educación',
  client:              'Marca / Cliente',
  audiovisual:         'Producción Audiovisual',
  design:              'Diseño y Creatividad',
} as const;

// ─── INTENCIÓN DE REGISTRO ────────────────────────────────────────────
export const INTENCIONES = {
  talent:              'Soy un profesional creativo',
  brand:               'Represento una marca o empresa',
  organization:        'Tengo o dirijo una agencia',
  join:                'Quiero unirme a un equipo',
} as const;

// ─── NIVELES DE REPUTACIÓN ────────────────────────────────────────────
export const NIVELES_REPUTACION = {
  novato:   { label: 'Novato',   rango: '0 - 499 pts' },
  pro:      { label: 'Pro',      rango: '500 - 1.999 pts' },
  elite:    { label: 'Elite',    rango: '2.000 - 4.999 pts' },
  master:   { label: 'Master',   rango: '5.000 - 14.999 pts' },
  legend:   { label: 'Leyenda',  rango: '15.000+ pts' },
} as const;

// ─── PLANES Y SUSCRIPCIONES ───────────────────────────────────────────
export const PLANES = {
  free:       'Gratuito',
  starter:    'Inicial',
  pro:        'Profesional',
  business:   'Empresarial',
  enterprise: 'Corporativo',

  // Periodos
  mensual:    'mensual',
  anual:      'anual',
  ahorra:     'Ahorras',
  mas_popular:'Más popular',
  recomendado:'Recomendado',

  // CTAs de planes
  comenzar:   'Comenzar ahora',
  probar:     'Probar gratis',
  actualizar: 'Mejorar mi plan',
  contactar:  'Contactar ventas',
} as const;

// ─── MÉTODOS DE PAGO ──────────────────────────────────────────────────
export const PAGOS_UI = {
  agregar_tarjeta:     'Agregar tarjeta',
  tarjeta_credito:     'Tarjeta de crédito',
  tarjeta_debito:      'Tarjeta débito',
  pse:                 'PSE',
  efectivo:            'Efectivo (Efecty / Baloto)',
  transferencia:       'Transferencia bancaria',
  saldo_billetera:     'Saldo de billetera',
  numero_tarjeta:      'Número de tarjeta',
  vencimiento:         'Fecha de vencimiento',
  titular:             'Nombre del titular',
  pago_seguro:         'Pago seguro con cifrado SSL',
  fondos_garantia:     'Tus fondos están protegidos hasta aprobar la entrega',
} as const;

// ─── TABS DEL ADN RECARGADO ───────────────────────────────────────────
export const TABS_ADN = {
  market_overview:    'Panorama del Mercado',
  jtbd:               'Trabajo por Hacer',
  pains_desires:      'Dolores y Deseos',
  competitors:        'Competidores',
  avatars:            'Avatares del Cliente',
  differentiation:    'Diferenciación',
  sales_angles:       'Ángulos de Venta',
  puv_transformation: 'Propuesta Única de Valor',
  lead_magnets:       'Imanes de Leads',
  video_creatives:    'Creativos de Video',
  content_calendar:   'Calendario de Contenido',
  launch_strategy:    'Estrategia de Lanzamiento',
  content_playbook:   'Playbook de Contenido',
  landing_pages:      'Páginas de Aterrizaje',
  whatsapp_funnel:    'Embudo de WhatsApp',
  paid_ads:           'Pauta Paga',
  email_marketing:    'Email Marketing',
  pricing_strategy:   'Estrategia de Precios',
  kpis_dashboard:     'Indicadores Clave (KPIs)',
  seo_strategy:       'Estrategia SEO',
  partnerships:       'Alianzas Estratégicas',
  community_strategy: 'Estrategia de Comunidad',
  analysis_info:      'Resumen Ejecutivo',
} as const;

// ─── CAPAS DEL MÉTODO CAST ────────────────────────────────────────────
export const CAST_UI = {
  C: { letra: 'C', nombre: 'Conocer',    frase: 'El que más sabe del cliente, gana.' },
  A: { letra: 'A', nombre: 'Atraer',     frase: 'Habla el idioma del nivel donde está tu cliente.' },
  S: { letra: 'S', nombre: 'Seducir',    frase: 'La venta es el resultado de suficiente confianza construida.' },
  T: { letra: 'T', nombre: 'Transformar',frase: 'El cliente satisfecho es tu mejor vendedor.' },
} as const;

// ─── TIPOS DE CONTENIDO ───────────────────────────────────────────────
export const TIPOS_CONTENIDO = {
  ugc:              'Contenido UGC',
  reel:             'Reel',
  tiktok_video:     'Video TikTok',
  youtube_video:    'Video YouTube',
  short:            'Video Corto',
  story:            'Historia',
  post:             'Publicación',
  carousel:         'Carrusel',
  podcast:          'Podcast',
  live:             'Transmisión en Vivo',
  blog:             'Artículo de Blog',
  email:            'Email',
  ad:               'Anuncio',
  thumbnail:        'Miniatura',
  script:           'Guión',
  photo:            'Fotografía',
  banner:           'Banner',
} as const;

// ─── FASES ESFERA ─────────────────────────────────────────────────────
export const FASES_ESFERA = {
  engage:      'Engage — Atracción',
  solution:    'Solution — Solución',
  remarketing: 'Remarketing — Retargeting',
  fidelize:    'Fidelize — Fidelización',
} as const;

// ─── HELPERS DE TIPOS ─────────────────────────────────────────────────
export type NavKey = keyof typeof NAV;
export type RolKey = keyof typeof ROLES;
export type EstadoContenido = keyof typeof ESTADOS_CONTENIDO;
export type AccionKey = keyof typeof ACCIONES;
export type ModuloKey = keyof typeof MODULOS;
export type TabADN = keyof typeof TABS_ADN;
export type BadgeKey = keyof typeof BADGES;
export type CategoriaMercado = keyof typeof CATEGORIAS_MERCADO;
export type IntencionKey = keyof typeof INTENCIONES;
export type NivelReputacion = keyof typeof NIVELES_REPUTACION;
export type PlanKey = keyof typeof PLANES;
export type TipoContenido = keyof typeof TIPOS_CONTENIDO;
export type FaseEsfera = keyof typeof FASES_ESFERA;
