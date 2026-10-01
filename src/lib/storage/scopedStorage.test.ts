// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { clearUserData, scopeKey, scopedGet, scopedSet, clearScope } from "./scopedStorage";
import { isPersistableQueryKey, persistedCacheKey } from "./queryCachePersistence";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("scopedStorage", () => {
  it("separa datos por usuario y organización", () => {
    scopedSet("borrador", { userId: "a", orgId: "o1" }, { x: 1 });
    expect(scopedGet("borrador", { userId: "a", orgId: "o1" })).toEqual({ x: 1 });
    expect(scopedGet("borrador", { userId: "b", orgId: "o1" })).toBeNull();
    expect(scopedGet("borrador", { userId: "a", orgId: "o2" })).toBeNull();
    expect(scopeKey("borrador", { userId: null })).toBeNull();
  });

  it("clearScope borra solo lo del usuario", () => {
    scopedSet("k", { userId: "a" }, 1);
    scopedSet("k", { userId: "b" }, 2);
    clearScope("a");
    expect(scopedGet("k", { userId: "a" })).toBeNull();
    expect(scopedGet("k", { userId: "b" })).toBe(2);
  });

  it("clearUserData borra lo privado y conserva preferencias del dispositivo", () => {
    localStorage.setItem("kreoon-rq-v1", "{}");
    localStorage.setItem(persistedCacheKey("a", "o1"), "{}");
    localStorage.setItem("currentOrganizationId", "o1");
    localStorage.setItem("selectedClientId", "c1");
    localStorage.setItem("kiro-chat-history", "[]");
    localStorage.setItem("kreoon_onboarding_quiz", "{}");
    localStorage.setItem("kreoon-theme", "light");
    localStorage.setItem("kreoon_cookie_consent", "1");
    scopedSet("k", { userId: "a" }, 1);
    sessionStorage.setItem("impersonation", "{}");
    sessionStorage.setItem("kreoon_access_gate", "ok");

    clearUserData();

    for (const k of ["kreoon-rq-v1", persistedCacheKey("a", "o1"), "currentOrganizationId", "selectedClientId", "kiro-chat-history", "kreoon_onboarding_quiz"]) {
      expect(localStorage.getItem(k)).toBeNull();
    }
    expect(scopedGet("k", { userId: "a" })).toBeNull();
    expect(localStorage.getItem("kreoon-theme")).toBe("light");
    expect(localStorage.getItem("kreoon_cookie_consent")).toBe("1");
    expect(sessionStorage.getItem("impersonation")).toBeNull();
    expect(sessionStorage.getItem("kreoon_access_gate")).toBe("ok");
  });
});

describe("caché persistida de React Query", () => {
  it("solo admite consultas de catálogo de la lista blanca", () => {
    expect(isPersistableQueryKey(["countries"])).toBe(true);
    expect(isPersistableQueryKey(["exchange-rates", "USD"])).toBe(true);
    expect(isPersistableQueryKey(["wallet", "u1"])).toBe(false);
    expect(isPersistableQueryKey(["content", "org"])).toBe(false);
  });
});
