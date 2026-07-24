import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatPanel from "../../components/ChatPanel";
import { useStore } from "../../store";

describe("ChatPanel", () => {
  beforeEach(() => {
    useStore.setState({
      activeChatId: null,
      messages: {},
      user: { id: 1, username: "alice" },
      connectionStatus: "connected",
    });
  });

  it("shows the empty state when no chat is active", () => {
    render(<ChatPanel />);
    expect(
      screen.getByText("Select a chat to start messaging"),
    ).toBeInTheDocument();
  });

  it("renders the message list and input when a chat is active", () => {
    useStore.setState({ activeChatId: "c1", messages: { c1: [] } });
    render(<ChatPanel />);

    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type a message"),
    ).toBeInTheDocument();
  });
});
