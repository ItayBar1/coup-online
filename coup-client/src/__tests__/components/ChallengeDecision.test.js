import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChallengeDecision from "../../components/game/ChallengeDecision";

// Mock influenceData so tests don't need full data file resolution
vi.mock("../../data/influenceData", () => ({
  INFLUENCE_DATA: {
    ambassador: { color: "#cdc6b2" },
    captain: { color: "#a88a86" },
    duke: { color: "#bbcf83" },
    assassin: { color: "#9a1a1a" },
  },
}));

function makeSocket() {
  return { emit: vi.fn() };
}

const exchangeAction = { action: "exchange", source: "Alice", target: null };
const stealAction = { action: "steal", source: "Bob", target: "Alice" };
const taxAction = { action: "tax", source: "Charlie", target: null };
const assassinateAction = {
  action: "assassinate",
  source: "Dave",
  target: "Eve",
};

describe("ChallengeDecision", () => {
  it("renders CHALLENGE CLAIM button", () => {
    render(
      <ChallengeDecision
        action={exchangeAction}
        name="Bob"
        socket={makeSocket()}
        doneChallengeVote={vi.fn()}
        closeOtherVotes={vi.fn()}
      />
    );
    expect(screen.getByText("CHALLENGE CLAIM")).toBeInTheDocument();
  });

  it("clicking CHALLENGE emits g-challengeDecision with isChallenging=true", () => {
    const socket = makeSocket();
    const doneChallengeVote = vi.fn();
    const closeOtherVotes = vi.fn();

    render(
      <ChallengeDecision
        action={exchangeAction}
        name="Bob"
        socket={socket}
        doneChallengeVote={doneChallengeVote}
        closeOtherVotes={closeOtherVotes}
      />
    );

    fireEvent.click(screen.getByText("CHALLENGE CLAIM"));

    expect(socket.emit).toHaveBeenCalledWith(
      "g-challengeDecision",
      expect.objectContaining({
        isChallenging: true,
        challengee: "Alice",
        challenger: "Bob",
      })
    );
    expect(doneChallengeVote).toHaveBeenCalled();
    expect(closeOtherVotes).toHaveBeenCalledWith("challenge");
  });

  it("shows exchange description for exchange action", () => {
    render(
      <ChallengeDecision
        action={exchangeAction}
        name="Bob"
        socket={makeSocket()}
        doneChallengeVote={vi.fn()}
        closeOtherVotes={vi.fn()}
      />
    );
    expect(screen.getByText(/AMBASSADOR/)).toBeInTheDocument();
  });

  it("shows steal description for steal action", () => {
    render(
      <ChallengeDecision
        action={stealAction}
        name="Alice"
        socket={makeSocket()}
        doneChallengeVote={vi.fn()}
        closeOtherVotes={vi.fn()}
      />
    );
    expect(screen.getByText(/CAPTAIN/)).toBeInTheDocument();
  });

  it("shows tax description for tax action", () => {
    render(
      <ChallengeDecision
        action={taxAction}
        name="Alice"
        socket={makeSocket()}
        doneChallengeVote={vi.fn()}
        closeOtherVotes={vi.fn()}
      />
    );
    expect(screen.getByText(/DUKE/)).toBeInTheDocument();
  });

  it("shows assassinate description for assassinate action", () => {
    render(
      <ChallengeDecision
        action={assassinateAction}
        name="Alice"
        socket={makeSocket()}
        doneChallengeVote={vi.fn()}
        closeOtherVotes={vi.fn()}
      />
    );
    expect(screen.getByText(/ASSASSIN/)).toBeInTheDocument();
  });
});
