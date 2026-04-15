import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ActionDecision from "../../components/game/ActionDecision";

function makeProps(overrides = {}) {
  return {
    doneAction: vi.fn(),
    name: "Alice",
    socket: { emit: vi.fn() },
    money: 5,
    players: [
      { name: "Alice", isDead: false },
      { name: "Bob", isDead: false },
      { name: "Carol", isDead: false },
    ],
    isActive: true,
    ...overrides,
  };
}

describe("ActionDecision", () => {
  it("emits g-actionDecision for immediate action (income)", () => {
    const props = makeProps();
    render(<ActionDecision {...props} />);

    fireEvent.click(screen.getByText("INCOME"));

    expect(props.socket.emit).toHaveBeenCalledWith("g-actionDecision", {
      action: { action: "income", target: null, source: "Alice" },
    });
    expect(props.doneAction).toHaveBeenCalled();
  });

  it("target picker has no CANCEL button", () => {
    const props = makeProps();
    render(<ActionDecision {...props} />);

    fireEvent.click(screen.getByText("ASSASSINATE"));
    expect(screen.queryByText("CANCEL")).not.toBeInTheDocument();
  });

  it("picking target emits action with target and closes via doneAction", () => {
    const props = makeProps();
    render(<ActionDecision {...props} />);

    fireEvent.click(screen.getByText("ASSASSINATE"));
    fireEvent.click(screen.getByText("Bob"));

    expect(props.socket.emit).toHaveBeenCalledWith("g-actionDecision", {
      action: { action: "assassinate", target: "Bob", source: "Alice" },
    });
    expect(props.doneAction).toHaveBeenCalledTimes(1);
  });
});
