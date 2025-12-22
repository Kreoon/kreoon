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
        title: "Panel de Estadísticas",
        content: "Resumen rápido del estado de tu negocio: contenido total, ingresos y tasa de completados.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "Gestión de Clientes",
        content: "Accede a la lista de clientes, sus paquetes activos, productos y pagos pendientes.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-team']",
        title: "Equipo de Trabajo",
        content: "Administra creadores y editores. Asigna contenido, revisa rendimiento y gestiona pagos.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Tablero Kanban",
        content: "Visualiza todo el contenido en producción. Arrastra tarjetas entre columnas para cambiar estados.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-content']",
        title: "Biblioteca de Contenido",
        content: "Accede a todos los videos, scripts y materiales. Filtra por cliente, estado o creador.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "Portafolio Público",
        content: "Red social interna donde puedes ver y compartir contenido aprobado con la comunidad.",
        position: "right"
      },
      {
        target: "[data-tour='notification-bell']",
        title: "Notificaciones",
        content: "Alertas importantes sobre entregas, pagos pendientes y actualizaciones del sistema.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "Configuración",
        content: "Gestiona tu perfil, permisos de roles, usuarios, referidos y más opciones del sistema.",
        position: "right"
      }
    ]
  },
  ambassador: {
    roleName: "Embajador",
    roleDescription: "Como embajador, tienes acceso al panel administrativo y puedes ver el progreso general del contenido y el equipo.",
    steps: [
      {
        target: "[data-tour='stats-section']",
        title: "Estadísticas Generales",
        content: "Visualiza el rendimiento general: contenido producido, ingresos y métricas clave.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "Clientes",
        content: "Accede a los clientes de la agencia y sus proyectos activos.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-content']",
        title: "Biblioteca de Contenido",
        content: "Explora todo el contenido producido: scripts, videos y materiales aprobados.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Tablero de Producción",
        content: "Observa el estado de todo el contenido en formato de tablero visual Kanban.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "Portafolio",
        content: "Accede a la red social donde puedes compartir tu trabajo y ver el de otros.",
        position: "right"
      },
      {
        target: "[data-tour='referral-stats']",
        title: "Programa de Referidos",
        content: "Gana comisiones por referir nuevos usuarios. Comparte tu código único.",
        position: "bottom"
      }
    ]
  },
  strategist: {
    roleName: "Estratega",
    roleDescription: "Como estratega, tu rol es crear scripts y estrategias de contenido para los clientes. Defines los ángulos de venta y guías a los creadores.",
    steps: [
      {
        target: "[data-tour='strategist-stats']",
        title: "Tus Estadísticas",
        content: "Resumen de tu trabajo: contenido asignado, scripts aprobados y en progreso.",
        position: "bottom"
      },
      {
        target: "[data-tour='strategist-progress']",
        title: "Progreso General",
        content: "Visualiza tu tasa de completado y el estado general de tus asignaciones.",
        position: "bottom"
      },
      {
        target: "[data-tour='ai-generator']",
        title: "Generador de Scripts con IA",
        content: "Usa inteligencia artificial para generar scripts basados en productos y ángulos de venta.",
        position: "top"
      },
      {
        target: "[data-tour='recent-content']",
        title: "Contenido Reciente",
        content: "Lista de tu contenido más reciente. Haz clic para ver detalles y editar scripts.",
        position: "top"
      },
      {
        target: "[data-tour='sidebar-scripts']",
        title: "Módulo de Scripts",
        content: "Accede a todos tus scripts organizados por cliente y estado.",
        position: "right"
      }
    ]
  },
  creator: {
    roleName: "Creador",
    roleDescription: "Como creador, grabas contenido para las marcas. Sigue los scripts aprobados y entrega videos de alta calidad.",
    steps: [
      {
        target: "[data-tour='creator-stats']",
        title: "Tus Estadísticas",
        content: "Resumen de tu trabajo: contenido asignado, en progreso, aprobado y pagos pendientes.",
        position: "bottom"
      },
      {
        target: "[data-tour='creator-progress']",
        title: "Tu Progreso",
        content: "Barra de progreso mostrando cuánto contenido has completado vs asignado.",
        position: "bottom"
      },
      {
        target: "[data-tour='creator-kanban']",
        title: "Tu Tablero de Trabajo",
        content: "Todo tu contenido organizado por estado. Haz clic en tarjetas para ver detalles y avanzar.",
        position: "top"
      },
      {
        target: "[data-tour='ambassador-toggle']",
        title: "Modo Embajador",
        content: "Activa para crear contenido como embajador con beneficios especiales.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-portfolio']",
        title: "Tu Portafolio",
        content: "Comparte tu trabajo en la red social interna y construye tu marca personal.",
        position: "right"
      }
    ]
  },
  editor: {
    roleName: "Editor",
    roleDescription: "Como editor, recibes videos grabados para editar. Tu trabajo es crear ediciones profesionales y entregarlas a tiempo.",
    steps: [
      {
        target: "[data-tour='editor-stats']",
        title: "Tus Estadísticas",
        content: "Resumen de tu carga: videos por editar, en proceso, completados y pagos.",
        position: "bottom"
      },
      {
        target: "[data-tour='editor-progress']",
        title: "Tu Rendimiento",
        content: "Visualiza tu tasa de completado y entregas a tiempo.",
        position: "bottom"
      },
      {
        target: "[data-tour='editor-kanban']",
        title: "Cola de Edición",
        content: "Contenido asignado organizado por estado. Haz clic para ver material y subir ediciones.",
        position: "top"
      },
      {
        target: "[data-tour='editor-alerts']",
        title: "Alertas Pendientes",
        content: "Notificaciones sobre contenido urgente o con problemas que requiere atención.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Tablero General",
        content: "Accede al tablero Kanban completo para ver todo el flujo de trabajo.",
        position: "right"
      }
    ]
  },
  client: {
    roleName: "Cliente",
    roleDescription: "Como cliente, puedes seguir el progreso de tu contenido, revisar y aprobar entregas, y descargar tu material producido.",
    steps: [
      {
        target: "[data-tour='client-stats']",
        title: "Resumen de tu Cuenta",
        content: "Estado de tu paquete: videos totales, pendientes de revisión, vistas y engagement.",
        position: "bottom"
      },
      {
        target: "[data-tour='client-progress']",
        title: "Progreso del Paquete",
        content: "Barra visual mostrando cuántos videos se han completado de tu paquete.",
        position: "bottom"
      },
      {
        target: "[data-tour='client-content']",
        title: "Tu Contenido",
        content: "Todos los videos producidos para tu marca. Revisa, aprueba o solicita cambios.",
        position: "top"
      },
      {
        target: "[data-tour='client-products']",
        title: "Tus Productos",
        content: "Lista de productos configurados con sus ángulos de venta y estrategias.",
        position: "top"
      },
      {
        target: "[data-tour='client-actions']",
        title: "Acciones Rápidas",
        content: "Accede al portafolio público y descarga tu contenido aprobado.",
        position: "top"
      },
      {
        target: "[data-tour='sidebar-chat']",
        title: "Chat con Estratega",
        content: "Comunícate directamente con tu estratega para dudas o solicitudes.",
        position: "right"
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
