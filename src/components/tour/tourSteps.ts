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
        content: "Aquí puedes ver un resumen rápido del estado de tu negocio: contenido total, ingresos y tasa de completados.",
        position: "bottom"
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "Gestión de Clientes",
        content: "Accede a la lista de clientes, sus paquetes activos y productos asignados.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-team']",
        title: "Equipo",
        content: "Administra tu equipo de creadores y editores. Asigna contenido y gestiona pagos.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Tablero Kanban",
        content: "Visualiza y gestiona el flujo de trabajo de todo el contenido arrastrando tarjetas entre columnas.",
        position: "right"
      },
      {
        target: "[data-tour='notification-bell']",
        title: "Notificaciones",
        content: "Recibe alertas importantes sobre entregas, pagos pendientes y actualizaciones del sistema.",
        position: "bottom"
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
        target: "[data-tour='sidebar-content']",
        title: "Biblioteca de Contenido",
        content: "Explora todo el contenido producido, incluyendo scripts, videos y materiales aprobados.",
        position: "right"
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Vista del Contenido",
        content: "Observa el estado de todo el contenido en producción en formato de tablero visual.",
        position: "right"
      }
    ]
  },
  creator: {
    roleName: "Creador",
    roleDescription: "Como creador, puedes ver y gestionar el contenido que te ha sido asignado. Sigue el flujo de trabajo para entregar contenido de calidad.",
    steps: [
      {
        target: "[data-tour='creator-stats']",
        title: "Tus Estadísticas",
        content: "Aquí puedes ver un resumen de tu trabajo: contenido asignado, en progreso, aprobado y tus pagos.",
        position: "bottom"
      },
      {
        target: "[data-tour='creator-kanban']",
        title: "Tu Tablero de Trabajo",
        content: "Visualiza todo tu contenido organizado por estado. Haz clic en cualquier tarjeta para ver los detalles y avanzar al siguiente paso.",
        position: "top"
      },
      {
        target: "[data-tour='ambassador-toggle']",
        title: "Modo Embajador",
        content: "Activa esta opción si quieres crear contenido como embajador de marca con beneficios especiales.",
        position: "bottom"
      }
    ]
  },
  editor: {
    roleName: "Editor",
    roleDescription: "Como editor, recibes contenido grabado para editar. Tu trabajo es fundamental para entregar videos de alta calidad.",
    steps: [
      {
        target: "[data-tour='editor-stats']",
        title: "Tus Estadísticas",
        content: "Visualiza tu carga de trabajo actual: videos pendientes, en edición y completados.",
        position: "bottom"
      },
      {
        target: "[data-tour='editor-kanban']",
        title: "Cola de Edición",
        content: "Aquí aparece todo el contenido asignado para editar. Haz clic en una tarjeta para ver el material y subir tu edición.",
        position: "top"
      }
    ]
  },
  client: {
    roleName: "Cliente",
    roleDescription: "Como cliente, puedes seguir el progreso de tu contenido, revisar y aprobar entregas, y acceder a todo tu material producido.",
    steps: [
      {
        target: "[data-tour='client-stats']",
        title: "Resumen de tu Cuenta",
        content: "Visualiza el estado de tu paquete: videos totales, pendientes de revisión, vistas y likes.",
        position: "bottom"
      },
      {
        target: "[data-tour='client-content']",
        title: "Tu Contenido",
        content: "Aquí puedes ver todos los videos producidos para tu marca. Revisa, aprueba o solicita cambios.",
        position: "top"
      },
      {
        target: "[data-tour='client-products']",
        title: "Acciones Rápidas",
        content: "Accede al portafolio público y a la configuración de tu cuenta.",
        position: "top"
      }
    ]
  }
};

export function getTourConfig(roles: string[]): RoleTourConfig | null {
  // Priority order: admin > ambassador > creator > editor > client
  const priorityOrder = ["admin", "ambassador", "creator", "editor", "client"];
  
  for (const role of priorityOrder) {
    if (roles.includes(role) && tourConfigs[role]) {
      return tourConfigs[role];
    }
  }
  
  return null;
}
