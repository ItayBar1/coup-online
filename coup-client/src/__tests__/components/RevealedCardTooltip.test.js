import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayerBoard from "../../components/game/PlayerBoard";

vi.mock("../../assets/cards", () => ({
  CARD_IMAGES: {
    duke: "/duke.png",
    assassin: "/assassin.png",
    captain: "/captain.png",
    ambassador: "/ambassador.png",
    contessa: "/contessa.png",
  },
}));

describe("Revealed influence tooltip on opponent board", () => {
  it("shows capitalized card name as title when hovered", () => {
    const { container } = render(
      <PlayerBoard
        currentPlayer="Alice"
        players={[
          {
            name: "Bob",
            isDead: false,
            money: 2,
            influences: ["duke"],
            revealedInfluences: ["captain"],
          },
        ]}
      />
    );

    const el = container.querySelector('[title="Captain"]');
    expect(el).not.toBeNull();
  });
});
