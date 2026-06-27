import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import Index from "@/pages/Index";

describe("Index", () => {
  it("keeps the hero Instagram link above the hero content so it can be clicked", () => {
    renderWithProviders(<Index />);

    const heroInstagramLink = screen.getAllByRole("link", {
      name: /instagramie/i,
    })[0];

    expect(heroInstagramLink).toHaveAttribute(
      "href",
      "https://www.instagram.com/drkolo_serwis/"
    );
    expect(heroInstagramLink.parentElement).toHaveClass("z-20");
  });
});
