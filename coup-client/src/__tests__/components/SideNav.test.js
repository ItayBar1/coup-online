import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SideNav from "../../components/game/SideNav";

describe("SideNav", () => {
  it("calls onTerminate when TERMINATE is clicked", () => {
    const onTerminate = vi.fn();
    render(
      <SideNav
        name="Alice"
        activeTab="command"
        onTabChange={vi.fn()}
        onTerminate={onTerminate}
      />
    );

    fireEvent.click(screen.getByText("TERMINATE"));
    expect(onTerminate).toHaveBeenCalledTimes(1);
  });

  it("calls onTabChange when another tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <SideNav
        name="Alice"
        activeTab="command"
        onTabChange={onTabChange}
        onTerminate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("LOGS"));
    expect(onTabChange).toHaveBeenCalledWith("logs");
  });
});
