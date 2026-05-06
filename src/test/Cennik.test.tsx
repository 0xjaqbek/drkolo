import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cennik from "@/pages/Cennik";

describe("Cennik", () => {
  it("renders heading", () => {
    render(<MemoryRouter><Cennik /></MemoryRouter>);
    expect(screen.getByText("Przejrzyste ceny, bez niespodzianek.")).toBeInTheDocument();
  });

  it("renders all 5 categories", () => {
    render(<MemoryRouter><Cennik /></MemoryRouter>);
    expect(screen.getByText("Przeglądy")).toBeInTheDocument();
    expect(screen.getByText("Naprawy")).toBeInTheDocument();
    expect(screen.getByText("Amortyzacja")).toBeInTheDocument();
    expect(screen.getByText("Koła")).toBeInTheDocument();
    expect(screen.getByText("Napęd")).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<MemoryRouter><Cennik /></MemoryRouter>);
    expect(screen.getByText("Wróć")).toBeInTheDocument();
  });
});
