import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Sidebar from "../../components/Sidebar";
import { useStore } from "../../store";
import { makeChat } from "../helpers/utils";

// ConnectionBanner (rendered by Sidebar) imports the client.
vi.mock("../../lib/client", () => ({ forceReconnect: vi.fn() }));

describe("Sidebar", () => {
  beforeEach(() => {
    useStore.setState({ chats: [], connectionStatus: "connected" });
  });

  it("renders a list item for each chat", () => {
    useStore.setState({
      chats: [
        makeChat({ id: "a", name: "Alpha" }),
        makeChat({ id: "b", name: "Beta" }),
      ],
    });
    render(<Sidebar />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
  });

  it("shows the connection banner when not connected", () => {
    useStore.setState({ connectionStatus: "disconnected" });
    render(<Sidebar />);
    expect(screen.getByText("Computer not connected")).toBeInTheDocument();
  });
});
