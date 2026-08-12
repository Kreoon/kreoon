import { TourStep } from "./TourTooltip";

export interface RoleTourConfig {
  roleName: string;
  roleDescription: string;
  steps: TourStep[];
}

/**
 * Onboarding de primer uso: máximo 3 pasos por rol.
 *
 * REGLA: todos los `target` deben existir en el DOM. Hoy el único emisor de
 * `data-tour` es el menú lateral (`Sidebar.tsx` → `item.tourId`), así que solo
 * se usan anclas del menú del rol correspondiente. Si se añade un paso nuevo,
 * primero hay que emitir su `data-tour` en la pantalla.
 */
export const tourConfigs: Record<string, RoleTourConfig> = {
  admin: {
    roleName: "Administrador",
    roleDescription: "Estas son las tres pantallas que vas a usar todos los días.",
    steps: [
      {
        target: "[data-tour='sidebar-dashboard']",
        title: "Aquí ves cómo va todo",
        content: "Tu pantalla de inicio: cuántos videos hay en marcha, qué falta y cuánto se ha cobrado.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Aquí viven los videos",
        content: "Cada video es una tarjeta. Arrástrala para moverla de una etapa a la siguiente.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "Aquí están tus clientes",
        content: "Empresas, personas de contacto y lo que cada una tiene contratado.",
        position: "right",
      },
    ],
  },
  digital_strategist: {
    roleName: "Estratega",
    roleDescription: "Estas son las tres pantallas que vas a usar todos los días.",
    steps: [
      {
        target: "[data-tour='sidebar-scripts']",
        title: "Aquí escribes los guiones",
        content: "Creas el guion de cada video, con ayuda de la IA si quieres.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-board']",
        title: "Aquí ves los videos en marcha",
        content: "El estado de cada video: quién lo graba, quién lo edita y qué falta.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-clients']",
        title: "Aquí están tus clientes",
        content: "La marca, los productos y lo que cada cliente tiene contratado.",
        position: "right",
      },
    ],
  },
  content_creator: {
    roleName: "Creador de Contenido",
    roleDescription: "Estas son las tres pantallas que vas a usar todos los días.",
    steps: [
      {
        target: "[data-tour='sidebar-board']",
        title: "Aquí está tu trabajo",
        content: "Los videos que te toca grabar. Abre una tarjeta para ver qué hay que hacer y subir tu grabación.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-scripts']",
        title: "Aquí están los guiones",
        content: "Lo que tienes que decir en cada video, listo para leer mientras grabas.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "Aquí cambias tus datos",
        content: "Tu perfil, tus redes y cómo quieres que te paguen.",
        position: "right",
      },
    ],
  },
  editor: {
    roleName: "Editor",
    roleDescription: "Estas son las tres pantallas que vas a usar todos los días.",
    steps: [
      {
        target: "[data-tour='sidebar-board']",
        title: "Aquí está tu trabajo",
        content: "Los videos que te toca editar. Abre una tarjeta para ver el material y subir tu edición.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-scripts']",
        title: "Aquí están los guiones",
        content: "El guion de cada video, para que la edición siga lo que se planeó.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-settings']",
        title: "Aquí cambias tus datos",
        content: "Tu perfil y cómo quieres que te paguen.",
        position: "right",
      },
    ],
  },
  client: {
    roleName: "Cliente",
    roleDescription: "Estas son las tres pantallas que vas a usar todos los días.",
    steps: [
      {
        target: "[data-tour='sidebar-dashboard']",
        title: "Aquí ves tu proceso paso a paso",
        content: "Te decimos en qué punto vamos y qué necesitamos de ti en cada momento.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-projects']",
        title: "Aquí están tus videos",
        content: "Míralos, apruébalos o pide cambios. También puedes descargarlos.",
        position: "right",
      },
      {
        target: "[data-tour='sidebar-facturas']",
        title: "Aquí están tus facturas",
        content: "Lo que has pagado y lo que está pendiente, con su comprobante.",
        position: "right",
      },
    ],
  },
};

/**
 * Rol → tour que le corresponde.
 *
 * - `creator` y `strategist` son claves legacy que todavía aparecen en filas
 *   viejas de `organization_members.role`; no usarlas en código nuevo.
 * - `creative_strategist` es canónica: comparte tour con `digital_strategist`
 *   porque usan las mismas tres pantallas.
 */
const ROLE_TO_TOUR: Record<string, string> = {
  creator: "content_creator",
  strategist: "digital_strategist",
  creative_strategist: "digital_strategist",
};

// Mismo orden de prioridad que `src/lib/roles.ts`.
const TOUR_PRIORITY = [
  "admin",
  "content_creator",
  "editor",
  "digital_strategist",
  "client",
];

export function getTourConfig(roles: string[]): RoleTourConfig | null {
  const normalized = new Set(
    roles.map((role) => ROLE_TO_TOUR[role] ?? role)
  );

  for (const role of TOUR_PRIORITY) {
    if (normalized.has(role) && tourConfigs[role]) {
      return tourConfigs[role];
    }
  }

  return null;
}
