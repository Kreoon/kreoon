import { describe, it, expect } from "vitest";
import {
  sanitizeReturnTo,
  pickAttribution,
  attributionToSearchParams,
  buildCanonicalRegistrationUrl,
  buildReferralRegistrationUrl,
  registrationPath,
  registrationContinuePath,
  normalizeOrgSlug,
  getRegistrationHostTarget,
} from "./index";

describe("sanitizeReturnTo", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/academia/curso-1?tab=2#lesson", "/academia/curso-1?tab=2#lesson"],
    ["/settings?section=profile", "/settings?section=profile"],
    ["  /marketplace  ", "/marketplace"],
  ])("acepta ruta interna %s", (input, expected) => {
    expect(sanitizeReturnTo(input)).toBe(expected);
  });

  it.each([
    "https://evil.com",
    "http://evil.com/x",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "data:text/html;base64,AAAA",
    "%2F%2Fevil.com", // codificado → "//evil.com"
    "/%2Fevil.com",
    "/a\n/b",
    "/a\u0000b",
    "evil.com",
    "",
    "   ",
    null,
    undefined,
  ])("rechaza destino externo o malformado: %j", (input) => {
    expect(sanitizeReturnTo(input as string)).toBeNull();
  });

  it("rechaza destinos que reentran al flujo de auth/registro (bucles)", () => {
    for (const p of ["/auth", "/auth/callback", "/registro/ugc-colombia", "/register", "/unete", "/unlock-access", "/api/x"]) {
      expect(sanitizeReturnTo(p)).toBeNull();
    }
  });

  it("permite únicamente el paso /registro/:slug/continuar (vuelta tras iniciar sesión)", () => {
    expect(sanitizeReturnTo("/registro/ugc-colombia/continuar")).toBe("/registro/ugc-colombia/continuar");
    expect(sanitizeReturnTo("/registro/ugc-colombia/continuar?utm_source=ig")).toBe("/registro/ugc-colombia/continuar?utm_source=ig");
    expect(sanitizeReturnTo("/registro/ugc-colombia/otra")).toBeNull();
    expect(sanitizeReturnTo("/registro/ugc-colombia/continuar/x")).toBeNull();
  });

  it("no se deja engañar por traversal que normaliza hacia /auth", () => {
    expect(sanitizeReturnTo("/a/../auth")).toBeNull();
    expect(sanitizeReturnTo("/a/%2e%2e/auth")).toBeNull();
  });

  it("no bloquea rutas que solo comparten prefijo textual", () => {
    expect(sanitizeReturnTo("/authors")).toBe("/authors");
    expect(sanitizeReturnTo("/registrosx")).toBe("/registrosx");
  });

  it("rechaza longitudes excesivas", () => {
    expect(sanitizeReturnTo("/" + "a".repeat(600))).toBeNull();
  });
});

describe("pickAttribution", () => {
  it("conserva solo UTM y ref", () => {
    const a = pickAttribution("utm_source=ig&utm_campaign=lanzamiento&ref=ABC123&role=admin&org=xyz&intent=brand&organization_id=1");
    expect(a).toEqual({ utm_source: "ig", utm_campaign: "lanzamiento", ref: "ABC123" });
  });

  it("descarta valores con caracteres peligrosos o demasiado largos", () => {
    expect(pickAttribution("utm_source=<script>alert(1)</script>")).toEqual({});
    expect(pickAttribution("ref=" + "a".repeat(101))).toEqual({});
    expect(pickAttribution("utm_medium=a/b")).toEqual({});
  });

  it("acepta texto con acentos y espacios razonables", () => {
    expect(pickAttribution(new URLSearchParams({ utm_campaign: "lanzamiento otoño" }))).toEqual({
      utm_campaign: "lanzamiento otoño",
    });
  });

  it("round-trip a search params", () => {
    const sp = attributionToSearchParams({ utm_source: "tt", ref: "X1" });
    expect(sp.get("utm_source")).toBe("tt");
    expect(sp.get("ref")).toBe("X1");
  });
});

describe("buildCanonicalRegistrationUrl", () => {
  it("redirige a /registro/:slug conservando atribución y next seguro, sin privilegios", () => {
    const url = buildCanonicalRegistrationUrl(
      "ugc-colombia",
      "?intent=brand&role=admin&plan=creator_pro&community=abc&utm_source=ig&ref=R1&next=/academia/x"
    );
    const u = new URL(url, "https://x.test");
    expect(u.pathname).toBe("/registro/ugc-colombia");
    expect(u.searchParams.get("utm_source")).toBe("ig");
    expect(u.searchParams.get("ref")).toBe("R1");
    expect(u.searchParams.get("next")).toBe("/academia/x");
    for (const banned of ["intent", "role", "plan", "community", "org", "type"]) {
      expect(u.searchParams.has(banned)).toBe(false);
    }
  });

  it("descarta next/redirect externo", () => {
    const url = buildCanonicalRegistrationUrl("ugc-colombia", "redirect=https://evil.com&next=//evil.com");
    expect(url).toBe("/registro/ugc-colombia");
  });

  it("acepta `redirect` legado (Academia) si es interno", () => {
    const url = buildCanonicalRegistrationUrl("ugc-colombia", "role=student&redirect=/academia/mi-espacio");
    expect(url).toBe("/registro/ugc-colombia?next=%2Facademia%2Fmi-espacio");
  });

  it("referido /r/:code viaja como ref validado", () => {
    expect(buildReferralRegistrationUrl("ugc-colombia", "ABC123")).toBe("/registro/ugc-colombia?ref=ABC123");
    // un code malicioso no se propaga
    expect(buildReferralRegistrationUrl("ugc-colombia", "<x>")).toBe("/registro/ugc-colombia");
  });
});

describe("paths y slugs", () => {
  it("construye rutas canónicas", () => {
    expect(registrationPath("ugc-colombia")).toBe("/registro/ugc-colombia");
    expect(registrationContinuePath("ugc-colombia", "next=%2Fx")).toBe("/registro/ugc-colombia/continuar?next=%2Fx");
  });

  it("normaliza y valida slugs", () => {
    expect(normalizeOrgSlug("  UGC-Colombia ")).toBe("ugc-colombia");
    expect(normalizeOrgSlug("../admin")).toBeNull();
    expect(normalizeOrgSlug("a")).toBeNull();
    expect(normalizeOrgSlug(null)).toBeNull();
    expect(normalizeOrgSlug("x".repeat(80))).toBeNull();
  });
});

describe("getRegistrationHostTarget", () => {
  it.each(["kreoon.com", "www.kreoon.com", "localhost", "127.0.0.1", "localhost:8080", "kreoon-git-x.vercel.app"])(
    "%s → organización predeterminada",
    (h) => expect(getRegistrationHostTarget(h)).toEqual({ kind: "default" })
  );

  it("subdominio y dominio propio → se resuelven en servidor, sin caer a la predeterminada", () => {
    expect(getRegistrationHostTarget("otra-org.kreoon.com")).toEqual({ kind: "domain", hostname: "otra-org.kreoon.com" });
    expect(getRegistrationHostTarget("crea.marca.co")).toEqual({ kind: "domain", hostname: "crea.marca.co" });
  });
});
