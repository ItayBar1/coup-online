import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PlayerBoard from "../../components/game/PlayerBoard";
import PlayerHand from "../../components/game/PlayerHand";

vi.mock("../../assets/cards", () => ({
  CARD_IMAGES: {
    duke: "/duke.png",
    assassin: "/assassin.png",
    captain: "/captain.png",
    ambassador: "/ambassador.png",
    contessa: "/contessa.png",
  },
}));

describe("Player visibility states", () => {
  it("PlayerBoard shows all revealed opponent influences", () => {
    render(
      <PlayerBoard
        currentPlayer="Alice"
        players={[
          {
            name: "Bob",
            isDead: false,
            money: 2,
            influences: ["duke"],
            revealedInfluences: ["captain", "assassin"],
          },
        ]}
      />
    );

    expect(screen.getAllByAltText("captain")).toHaveLength(1);
    expect(screen.getAllByAltText("assassin")).toHaveLength(1);
  });

  it("PlayerHand shows revealed cards as DEAD CARD when player still alive", () => {
    render(
      <PlayerHand
        influences={["duke"]}
        revealedInfluences={["captain"]}
        isDead={false}
      />
    );

    expect(screen.getByText("DEAD CARD")).toBeInTheDocument();
    expect(screen.getByText("REVEALED")).toBeInTheDocument();
  });

  it("PlayerHand shows revealed cards as OUT OF GAME when player eliminated", () => {
    render(
      <PlayerHand
        influences={[]}
        revealedInfluences={["assassin"]}
        isDead={true}
      />
    );

    expect(screen.getByText("OUT OF GAME")).toBeInTheDocument();
    expect(screen.getByText("REVEALED")).toBeInTheDocument();
  });
});
