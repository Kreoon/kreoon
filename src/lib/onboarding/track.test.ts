import { describe, it, expect } from "vitest";
import { getOnboardingTrack, getCreatorStartStep } from "./track";

describe("getOnboardingTrack", () => {
  it("creadores → asistente de creadores", () => {
    expect(getOnboardingTrack({ roles: ["content_creator"], userType: null })).toBe("creator");
    expect(getOnboardingTrack({ roles: ["creator"], userType: "talent" })).toBe("creator");
    expect(getOnboardingTrack({ roles: ["ugc_creator", "editor"], userType: null })).toBe("creator");
  });

  it("clientes/marcas existentes conservan su flujo (no se convierten)", () => {
    expect(getOnboardingTrack({ roles: ["client"], userType: "client" })).toBe("legacy");
    expect(getOnboardingTrack({ roles: [], userType: "client" })).toBe("legacy");
    // un rol de creador no pisa a un cliente
    expect(getOnboardingTrack({ roles: ["client", "content_creator"], userType: null })).toBe("legacy");
  });

  it("otros roles (editor, estrategas, estudiantes) siguen su flujo", () => {
    expect(getOnboardingTrack({ roles: ["editor"], userType: null })).toBe("legacy");
    expect(getOnboardingTrack({ roles: ["digital_strategist"], userType: "talent" })).toBe("legacy");
    expect(getOnboardingTrack({ roles: ["student"], userType: null })).toBe("legacy");
  });

  it("sin roles ni tipo de cliente → debe unirse vía registro de creadores (no elige marca)", () => {
    expect(getOnboardingTrack({ roles: [], userType: null })).toBe("needs_membership");
    expect(getOnboardingTrack({ roles: [], userType: "talent" })).toBe("needs_membership");
  });
});

describe("getCreatorStartStep (reanudable)", () => {
  it("empieza en el primer paso incompleto", () => {
    expect(getCreatorStartStep({ hasCustomName: false, hasAvatar: false, contentTypesCount: 0 })).toBe("name");
    expect(getCreatorStartStep({ hasCustomName: true, hasAvatar: false, contentTypesCount: 0 })).toBe("photo");
    expect(getCreatorStartStep({ hasCustomName: true, hasAvatar: true, contentTypesCount: 0 })).toBe("content");
    expect(getCreatorStartStep({ hasCustomName: true, hasAvatar: true, contentTypesCount: 2 })).toBe("done");
  });
});
