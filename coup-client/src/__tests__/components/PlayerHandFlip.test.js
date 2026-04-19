import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayerHand from "../../components/game/PlayerHand";

vi.mock("../../assets/cards", () => ({
  CARD_IMAGES: {
    duke: "/duke.png",
    captain: "/captain.png",
  },
}));

describe("PlayerHand own-card flip", () => {
  it("clicking a live card hides its face; clicking again shows it", () => {
    const { container } = render(
      <PlayerHand influences={["duke", "captain"]} revealedInfluences={[]} />
    );

    // Initially both card faces visible via alt text
    expect(screen.getAllByAltText("duke")).toHaveLength(1);
    expect(screen.getAllByAltText("captain")).toHaveLength(1);

    // Click first live card
    const cards = container.querySelectorAll('[data-testid="own-influence"]');
    expect(cards.length).toBe(2);
    fireEvent.click(cards[0]);

    // After flip, duke face hidden
    expect(screen.queryByAltText("duke")).toBeNull();
    expect(screen.getAllByAltText("captain")).toHaveLength(1);

    // Click again — face returns
    fireEvent.click(cards[0]);
    expect(screen.getAllByAltText("duke")).toHaveLength(1);
  });
});
