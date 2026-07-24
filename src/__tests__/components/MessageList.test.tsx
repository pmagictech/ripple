import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageList from "../../components/MessageList";
import { useStore } from "../../store";
import { makeMessage } from "../helpers/utils";

describe("MessageList", () => {
  beforeEach(() => {
    useStore.setState({ user: { id: 1, username: "alice" }, messages: {} });
  });

  it("renders one item per message in the chat", () => {
    useStore.setState({
      messages: {
        c1: [
          makeMessage({ id: 1, chatId: "c1", content: "first" }),
          makeMessage({ id: 2, chatId: "c1", content: "second" }),
        ],
      },
    });
    render(<MessageList chatId="c1" />);

    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("renders no message items for a chat with an empty message list", () => {
    // The app seeds messages[chatId] = [] via addChat, so use a seeded array
    // (an *unseeded* chatId makes the store selector return a fresh [] each
    // render, which would infinite-loop — a separate latent footgun in the app).
    useStore.setState({ messages: { c1: [] } });
    render(<MessageList chatId="c1" />);
    expect(screen.queryByText(/first|second/)).not.toBeInTheDocument();
  });
});
