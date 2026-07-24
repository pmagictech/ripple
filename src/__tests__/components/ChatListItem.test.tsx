import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatListItem from "../../components/ChatListItem";
import { useStore } from "../../store";
import { makeChat } from "../helpers/utils";

describe("ChatListItem", () => {
  beforeEach(() => {
    useStore.setState({ activeChatId: null });
  });

  it("renders the chat name and its initial", () => {
    const chat = makeChat({ id: "c1", name: "Friends" });
    render(<ChatListItem chat={chat} />);

    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  it("selects the chat on click", async () => {
    const user = userEvent.setup();
    const chat = makeChat({ id: "c1", name: "Friends" });
    render(<ChatListItem chat={chat} />);

    await user.click(screen.getByText("Friends"));
    expect(useStore.getState().activeChatId).toBe("c1");
  });

  it("toggles the active chat off when clicked while active", async () => {
    const user = userEvent.setup();
    const chat = makeChat({ id: "c1", name: "Friends" });
    useStore.setState({ activeChatId: "c1" });
    render(<ChatListItem chat={chat} />);

    await user.click(screen.getByText("Friends"));
    expect(useStore.getState().activeChatId).toBeNull();
  });
});
