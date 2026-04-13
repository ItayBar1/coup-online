import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExchangeInfluences from "../../components/game/ExchangeInfluences";

function makeSocket() {
  const emitted = [];
  return {
    emit: vi.fn((event, data) => emitted.push({ event, data })),
    _emitted: emitted,
  };
}

vi.mock("../../assets/cards", () => ({
  CARD_IMAGES: {
    duke: null,
    captain: null,
    ambassador: null,
    contessa: null,
    assassin: null,
  },
}));

describe("ExchangeInfluences", () => {
  it("renders all 4 influence cards", () => {
    const socket = makeSocket();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={vi.fn()}
      />
    );

    influences.forEach((inf) => {
      expect(screen.getAllByText(inf.toUpperCase()).length).toBeGreaterThan(0);
    });
  });

  it("confirm button disabled until exactly toKeep cards selected", () => {
    const socket = makeSocket();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={vi.fn()}
      />
    );

    const confirmBtn = screen.getByText("CONFIRM EXCHANGE");
    expect(confirmBtn).toBeDisabled();

    // Select first card — still not enough
    fireEvent.click(screen.getAllByText("SELECT")[0]);
    expect(confirmBtn).toBeDisabled();
    expect(socket.emit).not.toHaveBeenCalled();

    // Select second card — now exactly 2
    fireEvent.click(screen.getAllByText("SELECT")[0]);
    expect(confirmBtn).not.toBeDisabled();
    expect(socket.emit).not.toHaveBeenCalled(); // no auto-submit
  });

  it("submits correct kept/putBack on confirm", () => {
    const socket = makeSocket();
    const doneExchangeInfluence = vi.fn();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={doneExchangeInfluence}
      />
    );

    // Select first two cards (duke, captain)
    // After selecting duke, captain becomes the first remaining SELECT button
    fireEvent.click(screen.getAllByText("SELECT")[0]);
    fireEvent.click(screen.getAllByText("SELECT")[0]);
    fireEvent.click(screen.getByText("CONFIRM EXCHANGE"));

    expect(socket.emit).toHaveBeenCalledWith("g-chooseExchangeDecision", {
      playerName: "Alice",
      kept: ["duke", "captain"],
      putBack: ["ambassador", "contessa"],
    });
    expect(doneExchangeInfluence).toHaveBeenCalled();
  });

  it("kept and putBack together equal all original influences", () => {
    const socket = makeSocket();
    const doneExchangeInfluence = vi.fn();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={doneExchangeInfluence}
      />
    );

    fireEvent.click(screen.getAllByText("SELECT")[0]);
    fireEvent.click(screen.getAllByText("SELECT")[1]);
    fireEvent.click(screen.getByText("CONFIRM EXCHANGE"));

    const call = socket.emit.mock.calls[0][1];
    const allCards = [...call.kept, ...call.putBack].sort();
    expect(allCards).toEqual([...influences].sort());
    expect(call.kept).toHaveLength(2);
    expect(call.putBack).toHaveLength(2);
  });

  it("can deselect a card before confirming", () => {
    const socket = makeSocket();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={vi.fn()}
      />
    );

    // Select duke
    fireEvent.click(screen.getAllByText("SELECT")[0]);
    // Deselect duke
    fireEvent.click(screen.getByText("SELECTED"));
    // Confirm still disabled
    expect(screen.getByText("CONFIRM EXCHANGE")).toBeDisabled();
  });

  it("shows correct remaining count", () => {
    const socket = makeSocket();
    const influences = ["duke", "captain", "ambassador", "contessa"];

    render(
      <ExchangeInfluences
        influences={influences}
        name="Alice"
        socket={socket}
        doneExchangeInfluence={vi.fn()}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
