// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { DataStateNotice } from "../DataStateNotice";
import { StatTile } from "../StatTile";

afterEach(cleanup);

describe("DataStateNotice", () => {
  it("muestra error con acción de reintentar", () => {
    const retry = vi.fn();
    const { getByRole, getByText } = render(
      <DataStateNotice error="boom" truncated={false} pageSize={500} onRetry={retry} />,
    );
    expect(getByRole("alert")).toBeTruthy();
    fireEvent.click(getByText("Reintentar"));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("avisa del resultado truncado", () => {
    const { getByRole } = render(<DataStateNotice error={null} truncated pageSize={500} onRetry={() => {}} />);
    expect(getByRole("status").textContent).toContain("primeros 500");
  });

  it("no renderiza nada cuando todo está bien", () => {
    const { container } = render(<DataStateNotice error={null} truncated={false} pageSize={500} onRetry={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("StatTile", () => {
  it("es un botón accesible cuando recibe onClick", () => {
    const click = vi.fn();
    const { getByRole } = render(<StatTile label="Parados" value="0" onClick={click} />);
    fireEvent.click(getByRole("button"));
    expect(click).toHaveBeenCalled();
  });
  it("es un div sin rol cuando no hay acción", () => {
    const { queryByRole } = render(<StatTile label="Total" value="12" />);
    expect(queryByRole("button")).toBeNull();
  });
});
