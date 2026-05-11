import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";

const renderHeader = (activePage: "home" | "cennik") =>
  render(
    <MemoryRouter>
      <SiteHeader activePage={activePage} />
    </MemoryRouter>
  );

describe("SiteHeader", () => {
  it("renders the logo", () => {
    renderHeader("home");
    expect(screen.getAllByRole("img", { name: "Dr Koło" }).length).toBeGreaterThan(0);
  });

  it("shows hamburger button with aria-label 'Otwórz menu'", () => {
    renderHeader("home");
    expect(screen.getByRole("button", { name: "Otwórz menu" })).toBeInTheDocument();
  });

  it("toggles aria-label to 'Zamknij menu' when hamburger is clicked", () => {
    renderHeader("home");
    fireEvent.click(screen.getByRole("button", { name: "Otwórz menu" }));
    expect(screen.getByRole("button", { name: "Zamknij menu" })).toBeInTheDocument();
  });

  it("shows all four nav section labels", () => {
    renderHeader("home");
    expect(screen.getAllByText("Usługi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("O nas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cennik").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kontakt").length).toBeGreaterThan(0);
  });

  it("renders Cennik as a non-link span when activePage is cennik", () => {
    renderHeader("cennik");
    const cennikItems = screen.getAllByText("Cennik");
    const spans = cennikItems.filter((el) => el.tagName === "SPAN");
    expect(spans.length).toBeGreaterThan(0);
  });
});
