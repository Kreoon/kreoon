// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QuickStatusButtons, hasQuickActions } from "./StatusChangeDropdown";

afterEach(cleanup);

describe("hasQuickActions — rol del creador normalizado", () => {
  it.each(["content_creator", "creator"])("el creador asignado (%s) tiene acciones en assigned y recording", (role) => {
    expect(hasQuickActions("assigned", role, true, false)).toBe(true);
    expect(hasQuickActions("recording", role, true, false)).toBe(true);
    expect(hasQuickActions("recorded", role, true, false)).toBe(false);
  });

  it("sin asignación o con rol desconocido no hay acciones", () => {
    expect(hasQuickActions("assigned", "content_creator", false, false)).toBe(false);
    expect(hasQuickActions("assigned", "rol_inventado", true, false)).toBe(false);
    expect(hasQuickActions("assigned", null, true, false)).toBe(false);
  });

  it("editor y cliente conservan su comportamiento", () => {
    expect(hasQuickActions("recorded", "editor", false, true)).toBe(true);
    expect(hasQuickActions("delivered", "client", false, false)).toBe(true);
  });
});

describe("QuickStatusButtons — creador con rol canónico content_creator", () => {
  const renderButtons = (currentStatus: "assigned" | "recording", userRole: string) => {
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickStatusButtons
        currentStatus={currentStatus}
        contentId="c1"
        userRole={userRole}
        isAssignedCreator
        onStatusChange={onStatusChange}
      />,
    );
    return onStatusChange;
  };

  it("muestra «Iniciar grabación» en assigned y cambia a recording", () => {
    const onStatusChange = renderButtons("assigned", "content_creator");
    fireEvent.click(screen.getByRole("button", { name: /Iniciar grabación/ }));
    expect(onStatusChange).toHaveBeenCalledWith("c1", "recording");
  });

  it("muestra «Grabado» y «Novedad» en recording", () => {
    const onStatusChange = renderButtons("recording", "content_creator");
    expect(screen.getByRole("button", { name: /Novedad/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Grabado/ }));
    expect(onStatusChange).toHaveBeenCalledWith("c1", "recorded");
  });

  it("el rol legado creator sigue funcionando", () => {
    renderButtons("assigned", "creator");
    expect(screen.getByRole("button", { name: /Iniciar grabación/ })).toBeTruthy();
  });
});
