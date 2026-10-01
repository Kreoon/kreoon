// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreatorHome } from "../CreatorHome";
import { FAQ_ITEMS } from "./HomeFaq";

// Radix (Accordion) usa ResizeObserver, que jsdom no trae.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(cleanup);

function setup(onLogin = vi.fn()) {
  render(
    <MemoryRouter>
      <CreatorHome onLogin={onLogin} />
    </MemoryRouter>,
  );
  return { onLogin };
}

describe("Home de Kreoon", () => {
  it("tiene un único H1 con el titular", () => {
    setup();
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toBe("Tu talento merece ser visto.");
  });

  it("todos los CTA de alta apuntan al registro canónico", () => {
    setup();
    const ctas = screen.getAllByRole("link", { name: "Crear mi cuenta" });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    for (const a of ctas) expect(a.getAttribute("href")).toBe("/registro");
  });

  it("las anclas del header y del hero tienen destino real en la página", () => {
    const { container } = render(
      <MemoryRouter>
        <CreatorHome onLogin={() => {}} />
      </MemoryRouter>,
    );
    for (const href of ["#como-funciona", "#tu-espacio", "#contenido"]) {
      const link = container.querySelector(`a[href="${href}"]`);
      expect(link, `enlace ${href}`).not.toBeNull();
      expect(container.querySelector(href), `destino ${href}`).not.toBeNull();
    }
  });

  it("el menú móvil se abre y se cierra con el botón y con Escape", () => {
    setup();
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar menú" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Abrir menú" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("«Iniciar sesión» dispara el acceso existente", () => {
    const { onLogin } = setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Iniciar sesión" })[0]);
    expect(onLogin).toHaveBeenCalled();
  });

  it("las preguntas frecuentes son botones nativos que abren y cierran su respuesta", () => {
    setup();
    const trigger = screen.getByRole("button", { name: FAQ_ITEMS[1].q });
    expect(trigger.tagName).toBe("BUTTON"); // operable con Enter/Espacio sin código extra
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("no fabrica señales sociales ni promesas de trabajo", () => {
    const { container } = render(
      <MemoryRouter>
        <CreatorHome onLogin={() => {}} />
      </MemoryRouter>,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/contrato ganado|pago recibido|\$\s?\d|USD|COP|seguidores/i);
    expect(within(container).getAllByText(/Vista ilustrativa/i).length).toBeGreaterThan(0);
  });
});
