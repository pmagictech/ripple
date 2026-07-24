import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageItem from "../../components/MessageItem";
import { useStore } from "../../store";
import { makeMessage } from "../helpers/utils";

describe("MessageItem", () => {
  beforeEach(() => {
    useStore.setState({ user: { id: 1, username: "me" } });
  });

  it("shows the content and a formatted time", () => {
    const msg = makeMessage({ userId: 2, username: "bob", content: "hi there" });
    render(<MessageItem message={msg} />);

    expect(screen.getByText("hi there")).toBeInTheDocument();
    // Time is rendered as a locale time like "1:33 PM" / "13:33".
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
  });

  it("capitalizes and shows the sender name for other people's messages", () => {
    const msg = makeMessage({ userId: 2, username: "bob" });
    render(<MessageItem message={msg} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("hides the sender name for the current user's own messages", () => {
    const msg = makeMessage({ userId: 1, username: "me", content: "mine" });
    render(<MessageItem message={msg} />);

    expect(screen.getByText("mine")).toBeInTheDocument();
    // "Me" header should not be rendered for own messages.
    expect(screen.queryByText("Me")).not.toBeInTheDocument();
  });
});
