import { describe, it, expect } from "vitest";
import { getPostAuthDestination, getDashboardPathForRoles } from "./postAuth";

describe("getPostAuthDestination", () => {
  it("respeta un next interno válido", () => {
    expect(getPostAuthDestination({ roles: ["content_creator"], next: "/academia/x" })).toBe("/academia/x");
  });

  it("ignora next externo/de auth y cae al dashboard (sin open redirect ni bucles)", () => {
    expect(getPostAuthDestination({ roles: ["client"], next: "https://evil.com" })).toBe("/client-dashboard");
    expect(getPostAuthDestination({ roles: ["client"], next: "//evil.com" })).toBe("/client-dashboard");
    expect(getPostAuthDestination({ roles: ["client"], next: "/auth" })).toBe("/client-dashboard");
    expect(getPostAuthDestination({ roles: ["client"], next: "/registro/ugc-colombia" })).toBe("/client-dashboard");
  });

  it("vuelve al paso continuar del registro tras iniciar sesión", () => {
    expect(getPostAuthDestination({ roles: [], next: "/registro/ugc-colombia/continuar" })).toBe("/registro/ugc-colombia/continuar");
  });

  it("usuarios existentes van a su espacio habitual", () => {
    expect(getPostAuthDestination({ roles: ["admin"] })).toBe("/dashboard");
    expect(getPostAuthDestination({ roles: ["content_creator"] })).toBe("/creator-dashboard");
    expect(getPostAuthDestination({ roles: ["creator"] })).toBe("/creator-dashboard");
    expect(getPostAuthDestination({ roles: ["editor"] })).toBe("/editor-dashboard");
    expect(getPostAuthDestination({ roles: ["client"] })).toBe("/client-dashboard");
  });

  it("multi-rol: el aterrizaje no depende del orden del arreglo", () => {
    expect(getPostAuthDestination({ roles: ["client", "content_creator"] })).toBe("/creator-dashboard");
    expect(getPostAuthDestination({ roles: ["content_creator", "client"] })).toBe("/creator-dashboard");
    expect(getPostAuthDestination({ roles: ["editor", "admin"] })).toBe("/dashboard");
  });

  it("roles sin página propia caen al mapa canónico (antes caían a 'sin roles' y rebotaban)", () => {
    expect(getPostAuthDestination({ roles: ["digital_strategist"] })).toBe("/creator-dashboard");
    expect(getPostAuthDestination({ roles: ["student"] })).toBe("/academia");
  });

  it("getDashboardPathForRoles es determinista y respeta el rol activo", () => {
    expect(getDashboardPathForRoles(["client", "content_creator"], "client")).toBe("/client-dashboard");
    expect(getDashboardPathForRoles(["client", "content_creator"])).toBe(getDashboardPathForRoles(["content_creator", "client"]));
    expect(getDashboardPathForRoles([])).toBe("/marketplace");
  });

  it("sin roles: marca o talento con perfil → marketplace; identidad sin nada → registro de creadores", () => {
    expect(getPostAuthDestination({ roles: [], isBrandMember: true })).toBe("/marketplace");
    expect(getPostAuthDestination({ roles: [], hasCreatorProfile: true })).toBe("/marketplace");
    expect(getPostAuthDestination({ roles: [] })).toBe("/registro");
  });
});
