import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectionBanner from "../../components/ConnectionBanner";
import { forceReconnect } from "../../lib/client";
import { useStore } from "../../store";

vi.mock("../../lib/client", () => ({ forceReconnect: vi.fn() }));

describe("ConnectionBanner", () => {
  beforeEach(() => {
    useStore.setState({ connectionStatus: "disconnected" });
  });

  it("renders nothing when connected", () => {
    useStore.setState({ connectionStatus: "connected" });
    const { container } = render(<ConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the disconnected banner when not connected", () => {
    render(<ConnectionBanner />);
    expect(screen.getByText("Computer not connected")).toBeInTheDocument();
  });

  it("calls forceReconnect when Reconnect is clicked", async () => {
    const user = userEvent.setup();
    render(<ConnectionBanner />);

    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(forceReconnect).toHaveBeenCalledOnce();
  });
});
