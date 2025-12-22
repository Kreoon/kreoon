import { TourStep } from "./TourTooltip";

export interface RoleTourConfig {
  roleName: string;
  roleDescription: string;
  steps: TourStep[];
}

export const tourConfigs: Record<string, RoleTourConfig> = {
  admin: {
    roleName: "Administrador",
    roleDescription: "Como administrador, tienes acceso completo a todas las funcionalidades del sistema. Puedes gestionar clientes, creadores, contenido, pagos y configuraciones.",
    steps: [
      {
        target: "[data-tour='stats-section']",
        title: "📊 Panel de Estadísticas",
        content: "Aquí ves el resumen de tu negocio: contenido total, ingresos y métricas clave de la agencia.",
        position: "bottom",
        action: "Haz clic en cualquier estadística para ver más detalles"
      },
      {
        target: "[data-tour='sidebar-dashboard']",
        title: "🏠 Dashboard Principal",
        content: "Este es tu centro de control. Siempre puedes volver aquí para ver el panorama general.",
        position: "right",
        action: "Haz clic aquí para ir al dashboard"
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "🏢 Gestión de Clientes",
        content: "Administra tus clientes, sus paquetes, productos y pagos. Todo centralizado en un solo lugar.",
        position: "right",
        action: "Haz clic para ver tus clientes"
      },
      {
        target: "[data-tour='sidebar-team']",
        title: "👥 Equipo de Trabajo",
        content: "Gestiona creadores y editores. Revisa rendimiento, asigna trabajo y procesa pagos.",
        position: "right",
        action: "Haz clic para administrar tu equipo"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "📋 Tablero Kanban",
        content: "Vista visual del flujo de trabajo. Arrastra tarjetas para cambiar el estado del contenido.",
        position: "right",
        action: "Haz clic para ver el tablero"
      },
      {
        target: "[data-tour='sidebar-content']",
        title: "🎬 Biblioteca de Contenido",
        content: "Todos los videos, scripts y materiales. Filtra por cliente, estado, creador o fecha.",
        position: "right",
        action: "Haz clic para explorar contenido"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Red Social / Portafolio",
        content: "Explora el portafolio público donde se comparte el mejor contenido de la agencia.",
        position: "right",
        action: "Haz clic para ver el portafolio"
      },
      {
        target: "[data-tour='notification-bell']",
        title: "🔔 Notificaciones",
        content: "Alertas sobre entregas, pagos, nuevos contenidos y actualizaciones importantes.",
        position: "bottom",
        action: "Haz clic en la campana para ver notificaciones"
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "⚙️ Configuración",
        content: "Personaliza tu perfil, gestiona permisos, usuarios, planes de suscripción y más.",
        position: "right",
        action: "Haz clic para acceder a configuración"
      }
    ]
  },
  ambassador: {
    roleName: "Embajador",
    roleDescription: "Como embajador, tienes acceso especial al panel y puedes ganar comisiones por referidos mientras creas contenido para las marcas.",
    steps: [
      {
        target: "[data-tour='stats-section']",
        title: "📊 Estadísticas Generales",
        content: "Vista general del rendimiento de la agencia y tu participación en ella.",
        position: "bottom",
        action: "Haz clic en una estadística para más detalles"
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "🏢 Clientes",
        content: "Explora los clientes activos de la agencia y sus proyectos en curso.",
        position: "right",
        action: "Haz clic para ver clientes"
      },
      {
        target: "[data-tour='sidebar-content']",
        title: "🎬 Contenido",
        content: "Accede a todo el contenido producido: scripts, videos y materiales.",
        position: "right",
        action: "Haz clic para explorar contenido"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "📋 Tablero de Producción",
        content: "Visualiza el estado de todo el contenido en formato Kanban visual.",
        position: "right",
        action: "Haz clic para ver el tablero"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Portafolio",
        content: "Red social interna donde compartes tu trabajo y descubres el de otros.",
        position: "right",
        action: "Haz clic para ver el portafolio"
      },
      {
        target: "[data-tour='referral-stats']",
        title: "💰 Programa de Referidos",
        content: "¡Gana comisiones! Comparte tu código único y recibe beneficios por cada referido.",
        position: "bottom",
        action: "Copia tu código y compártelo"
      }
    ]
  },
  strategist: {
    roleName: "Estratega",
    roleDescription: "Como estratega, creas scripts y estrategias de contenido. Defines los ángulos de venta y guías a los creadores para producir contenido efectivo.",
    steps: [
      {
        target: "[data-tour='strategist-stats']",
        title: "📊 Tus Estadísticas",
        content: "Resumen de tu trabajo: scripts asignados, aprobados, pendientes y tu rendimiento.",
        position: "bottom",
        action: "Revisa tus métricas de productividad"
      },
      {
        target: "[data-tour='strategist-progress']",
        title: "📈 Progreso General",
        content: "Barra de progreso mostrando tu avance en las asignaciones actuales.",
        position: "bottom",
        action: "Mantén tu barra de progreso al día"
      },
      {
        target: "[data-tour='sidebar-scripts']",
        title: "✍️ Módulo de Scripts",
        content: "Aquí creas y gestionas todos tus scripts con ayuda de inteligencia artificial.",
        position: "right",
        action: "Haz clic para ir a scripts"
      },
      {
        target: "[data-tour='ai-generator']",
        title: "🤖 Generador de Scripts IA",
        content: "Usa IA para generar scripts profesionales basados en productos y ángulos de venta.",
        position: "top",
        action: "Selecciona un producto y genera un script"
      },
      {
        target: "[data-tour='recent-content']",
        title: "📝 Contenido Reciente",
        content: "Lista de tu trabajo más reciente. Haz clic para editar scripts o ver estados.",
        position: "top",
        action: "Haz clic en una tarjeta para ver detalles"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Portafolio",
        content: "Inspírate viendo el contenido publicado y el trabajo de otros creadores.",
        position: "right",
        action: "Haz clic para explorar el portafolio"
      }
    ]
  },
  creator: {
    roleName: "Creador",
    roleDescription: "Como creador, grabas contenido para las marcas. Sigue los scripts aprobados y entrega videos de alta calidad que conecten con la audiencia.",
    steps: [
      {
        target: "[data-tour='creator-stats']",
        title: "📊 Tus Estadísticas",
        content: "Todo sobre tu trabajo: asignaciones, contenido en progreso, aprobados y pagos.",
        position: "bottom",
        action: "Haz clic para ver detalles de cada métrica"
      },
      {
        target: "[data-tour='creator-progress']",
        title: "📈 Tu Progreso",
        content: "Barra visual de cuánto has avanzado en tus asignaciones del mes.",
        position: "bottom",
        action: "Completa más contenido para aumentar tu progreso"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "📋 Tu Tablero de Trabajo",
        content: "Aquí ves todo tu contenido asignado organizado por estado (pendiente, grabando, etc).",
        position: "right",
        action: "Haz clic para ver tu tablero"
      },
      {
        target: "[data-tour='creator-kanban']",
        title: "🎬 Tarjetas de Contenido",
        content: "Cada tarjeta es un video por grabar. Haz clic para ver el script y subir tu grabación.",
        position: "top",
        action: "Haz clic en una tarjeta para trabajar en ella"
      },
      {
        target: "[data-tour='ambassador-toggle']",
        title: "⭐ Modo Embajador",
        content: "¿Eres embajador? Activa esto para crear contenido con beneficios especiales.",
        position: "bottom",
        action: "Activa si eres embajador de alguna marca"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Tu Portafolio",
        content: "Comparte tu mejor trabajo y construye tu marca personal en la red social interna.",
        position: "right",
        action: "Haz clic para ver y publicar en tu portafolio"
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "⚙️ Tu Perfil",
        content: "Actualiza tu información, redes sociales y preferencias de notificación.",
        position: "right",
        action: "Haz clic para editar tu perfil"
      }
    ]
  },
  editor: {
    roleName: "Editor",
    roleDescription: "Como editor, recibes videos grabados para editar. Tu trabajo es crear ediciones profesionales con música, efectos y entregarlas a tiempo.",
    steps: [
      {
        target: "[data-tour='editor-stats']",
        title: "📊 Tus Estadísticas",
        content: "Resumen de tu carga: videos por editar, en proceso, completados y tus ganancias.",
        position: "bottom",
        action: "Revisa cuántos videos tienes pendientes"
      },
      {
        target: "[data-tour='editor-progress']",
        title: "📈 Tu Rendimiento",
        content: "Métricas de productividad: tasa de completado y entregas a tiempo.",
        position: "bottom",
        action: "Mantén tu tasa de entregas alta"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "📋 Tablero General",
        content: "Vista completa del flujo de trabajo de la agencia en formato Kanban.",
        position: "right",
        action: "Haz clic para ver el tablero"
      },
      {
        target: "[data-tour='editor-kanban']",
        title: "🎬 Cola de Edición",
        content: "Tus asignaciones organizadas. Haz clic en una tarjeta para ver el material y subir tu edición.",
        position: "top",
        action: "Haz clic en una tarjeta para empezar a editar"
      },
      {
        target: "[data-tour='editor-alerts']",
        title: "⚠️ Alertas Pendientes",
        content: "Contenido urgente o con problemas que necesita tu atención inmediata.",
        position: "bottom",
        action: "Revisa las alertas rojas primero"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Portafolio",
        content: "Inspírate con el trabajo publicado y comparte tus mejores ediciones.",
        position: "right",
        action: "Haz clic para ver el portafolio"
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "⚙️ Configuración",
        content: "Actualiza tu perfil, especialidades y métodos de pago.",
        position: "right",
        action: "Haz clic para editar tu perfil"
      }
    ]
  },
  client: {
    roleName: "Cliente",
    roleDescription: "Como cliente, puedes seguir el progreso de tu contenido, revisar y aprobar entregas, descargar videos y comunicarte con tu estratega.",
    steps: [
      {
        target: "[data-tour='client-stats']",
        title: "📊 Resumen de tu Cuenta",
        content: "Estado de tu paquete: videos totales, pendientes de revisión, y métricas de engagement.",
        position: "bottom",
        action: "Revisa cuántos videos tienes disponibles"
      },
      {
        target: "[data-tour='client-progress']",
        title: "📈 Progreso del Paquete",
        content: "Barra visual mostrando cuántos videos se han completado de tu paquete contratado.",
        position: "bottom",
        action: "Sigue el progreso de tu inversión"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "📋 Tu Tablero",
        content: "Vista de todos tus videos organizados por estado: en producción, para revisar, aprobados.",
        position: "right",
        action: "Haz clic para ver tu tablero de contenido"
      },
      {
        target: "[data-tour='client-content']",
        title: "🎬 Tu Contenido",
        content: "Todos los videos producidos para tu marca. Revisa, aprueba o solicita cambios.",
        position: "top",
        action: "Haz clic en un video para revisarlo"
      },
      {
        target: "[data-tour='client-products']",
        title: "📦 Tus Productos",
        content: "Productos configurados con sus descripciones, ángulos de venta y estrategias.",
        position: "top",
        action: "Haz clic para ver o agregar productos"
      },
      {
        target: "[data-tour='client-actions']",
        title: "⚡ Acciones Rápidas",
        content: "Descarga tu contenido aprobado o accede al portafolio público.",
        position: "top",
        action: "Haz clic en descargar para obtener tus videos"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "🌐 Portafolio Público",
        content: "Explora el portafolio donde puedes ver contenido de referencia y tendencias.",
        position: "right",
        action: "Haz clic para explorar el portafolio"
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "⚙️ Configuración",
        content: "Actualiza la información de tu empresa y preferencias de notificación.",
        position: "right",
        action: "Haz clic para editar tu perfil"
      }
    ]
  }
};

export function getTourConfig(roles: string[]): RoleTourConfig | null {
  // Priority order: admin > ambassador > strategist > creator > editor > client
  const priorityOrder = ["admin", "ambassador", "strategist", "creator", "editor", "client"];
  
  for (const role of priorityOrder) {
    if (roles.includes(role) && tourConfigs[role]) {
      return tourConfigs[role];
    }
  }
  
  return null;
}