// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { CreatorSignupForm } from "./CreatorSignupForm";
import { VerifyEmailPanel, RESEND_COOLDOWN_SECONDS } from "./VerifyEmailPanel";

// Radix (Checkbox) usa ResizeObserver, que jsdom no trae.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const DOCS = [
  { document_id: "d1", document_type: "general_terms", title: "Términos Generales", version: "v1.0", summary: null },
  { document_id: "d2", document_type: "talent_agreement", title: "Acuerdo de Talento", version: "1.0", summary: null },
];

function Harness(props: { onSubmit?: (v: unknown) => void; onGoogle?: () => void }) {
  const [consented, setConsented] = React.useState(false);
  return (
    <CreatorSignupForm
      orgName="UGC Colombia"
      documents={DOCS}
      consented={consented}
      onConsentChange={setConsented}
      submitting={false}
      googleLoading={false}
      error={null}
      onSubmit={props.onSubmit ?? (() => {})}
      onGoogle={props.onGoogle ?? (() => {})}
    />
  );
}

const fill = (name: string, email: string, password: string) => {
  fireEvent.change(document.getElementById("reg-name")!, { target: { value: name } });
  fireEvent.change(document.getElementById("reg-email")!, { target: { value: email } });
  fireEvent.change(document.getElementById("reg-password")!, { target: { value: password } });
};

describe("CreatorSignupForm", () => {
  it("muestra la organización y solo los campos necesarios (sin repetir contraseña, teléfono ni documento)", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Únete a UGC Colombia como creador");
    expect(document.getElementById("reg-name")).toBeTruthy();
    expect(document.getElementById("reg-email")).toBeTruthy();
    expect(document.getElementById("reg-password")).toBeTruthy();
    expect(document.querySelectorAll("input[type=password], input[type=text][id*=password]").length).toBe(1);
    expect(document.querySelector("input[type=tel]")).toBeNull();
    // no hay selector de tipo de cuenta
    expect(screen.queryByText(/marca|empresa|agencia|estudiante/i)).toBeNull();
  });

  it("no envía sin consentimiento y muestra el error; tampoco permite Google sin aceptar", () => {
    const onSubmit = vi.fn();
    const onGoogle = vi.fn();
    render(<Harness onSubmit={onSubmit} onGoogle={onGoogle} />);
    fill("Ana", "ana@test.co", "clave-segura-123");
    fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/necesitas aceptar/i);
    fireEvent.click(screen.getByRole("button", { name: /Continuar con Google/ }));
    expect(onGoogle).not.toHaveBeenCalled();
  });

  it("valida nombre, correo y contraseña mínima", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(document.getElementById("creator-consent")!);
    fill("A", "no-es-correo", "corta");
    fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Escribe tu nombre.")).toBeTruthy();
    expect(screen.getByText(/correo esté bien escrito/)).toBeTruthy();
  });

  it("envía valores recortados cuando todo es válido y hay consentimiento", () => {
    const onSubmit = vi.fn();
    const onGoogle = vi.fn();
    render(<Harness onSubmit={onSubmit} onGoogle={onGoogle} />);
    fireEvent.click(document.getElementById("creator-consent")!);
    fill("  Ana Creadora ", " ana@test.co ", "clave-segura-123");
    fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ana Creadora", email: "ana@test.co", password: "clave-segura-123" });
    fireEvent.click(screen.getByRole("button", { name: /Continuar con Google/ }));
    expect(onGoogle).toHaveBeenCalledTimes(1);
  });

  it("la contraseña tiene mostrar/ocultar accesible", () => {
    render(<Harness />);
    const input = document.getElementById("reg-password") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("la casilla de consentimiento nunca viene premarcada y enlaza cada documento con su versión", () => {
    render(<Harness />);
    expect((document.getElementById("creator-consent") as HTMLElement).getAttribute("data-state")).toBe("unchecked");
    const link = screen.getByRole("link", { name: "Términos Generales" }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/legal/general_terms");
    expect(link.getAttribute("rel")).toContain("noopener");
  });
});

// El contador se re-agenda tras cada render: se avanza segundo a segundo, como en el navegador.
async function tick(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("VerifyEmailPanel", () => {
  it("el reenvío respeta el cooldown de 60 s y luego llama a onResend", async () => {
    vi.useFakeTimers();
    const onResend = vi.fn().mockResolvedValue(undefined);
    render(<VerifyEmailPanel email="ana@test.co" onResend={onResend} onWrongEmail={() => {}} />);
    const btn = () => screen.getByRole("button", { name: /Reenviar correo/ }) as HTMLButtonElement;
    expect(btn().disabled).toBe(true);
    expect(btn().textContent).toContain(`${RESEND_COOLDOWN_SECONDS}s`);
    await tick(RESEND_COOLDOWN_SECONDS - 1);
    expect(btn().disabled).toBe(true);
    await tick(1);
    expect(btn().disabled).toBe(false);
    await act(async () => { fireEvent.click(btn()); });
    expect(onResend).toHaveBeenCalledTimes(1);
    // tras reenviar vuelve a bloquearse
    expect(btn().disabled).toBe(true);
  });

  it("muestra el correo al que se envió, permite corregirlo y no afirma que esté verificado", () => {
    const onWrong = vi.fn();
    render(<VerifyEmailPanel email="ana@test.co" onResend={vi.fn()} onWrongEmail={onWrong} />);
    expect(screen.getByText("ana@test.co")).toBeTruthy();
    expect(screen.queryByText(/verificad/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Me equivoqué de correo" }));
    expect(onWrong).toHaveBeenCalled();
  });

  it("avisa cuando el reenvío está limitado por demasiados intentos", async () => {
    vi.useFakeTimers();
    const err = Object.assign(new Error("rate"), { code: "rate_limited" });
    render(<VerifyEmailPanel email="a@b.co" onResend={vi.fn().mockRejectedValue(err)} onWrongEmail={() => {}} />);
    await tick(RESEND_COOLDOWN_SECONDS);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Reenviar correo/ })); });
    expect(screen.getByRole("alert").textContent).toMatch(/muchos intentos/i);
  });
});
