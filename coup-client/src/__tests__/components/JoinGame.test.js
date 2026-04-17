import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import JoinGame from "../../components/JoinGame";

vi.mock("axios");
vi.mock("socket.io-client");

describe("JoinGame — room code normalization", () => {
  it("normalizes lowercase room code input to uppercase", () => {
    render(
      <MemoryRouter>
        <JoinGame />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("Enter 6-digit code...");
    fireEvent.change(input, { target: { value: "abcdef" } });
    expect(input.value).toBe("ABCDEF");
  });

  it("preserves already-uppercase code unchanged", () => {
    render(
      <MemoryRouter>
        <JoinGame />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("Enter 6-digit code...");
    fireEvent.change(input, { target: { value: "ABCDEF" } });
    expect(input.value).toBe("ABCDEF");
  });

  it("normalizes mixed-case to uppercase", () => {
    render(
      <MemoryRouter>
        <JoinGame />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("Enter 6-digit code...");
    fireEvent.change(input, { target: { value: "aBcDeF" } });
    expect(input.value).toBe("ABCDEF");
  });
});
