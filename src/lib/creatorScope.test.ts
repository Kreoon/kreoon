import { describe, expect, it } from "vitest";
import { isBlockedForProduction, isProductionOnlyTalent, productionRedirectFor } from "./creatorScope";

describe("alcance de creadores", () => {
  it("el constructor de bloques lleva al editor simple", () => {
    expect(productionRedirectFor("/profile-builder")).toBe("/mi-portafolio");
    expect(productionRedirectFor("/profile-builder/v2")).toBe("/mi-portafolio");
    expect(productionRedirectFor("/mi-portafolio")).toBeNull();
    expect(productionRedirectFor("/profile-builder-x")).toBeNull();
  });

  it("solo aplica a roles de producción", () => {
    expect(isProductionOnlyTalent(["creator"])).toBe(true);
    expect(isProductionOnlyTalent(["content_creator", "editor"])).toBe(true);
    expect(isProductionOnlyTalent(["creator", "admin"])).toBe(false);
    expect(isProductionOnlyTalent([])).toBe(false);
  });

  it("mi portafolio no está bloqueado", () => {
    expect(isBlockedForProduction("/mi-portafolio")).toBe(false);
    expect(isBlockedForProduction("/marketplace")).toBe(true);
  });
});
