import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MessageInput from "../../components/MessageInput";
import { sendData } from "../../lib/client";
import { useStore } from "../../store";

vi.mock("../../lib/client", () => ({ sendData: vi.fn() }));

describe("MessageInput", () => {
  beforeEach(() => {
    useStore.setState({
      user: { id: 1, username: "alice" },
      connectionStatus: "connected",
    });
  });

  it("disables the send button when not connected", () => {
    useStore.setState({ connectionStatus: "disconnected" });
    render(<MessageInput chatId="c1" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("enables the send button when connected", () => {
    render(<MessageInput chatId="c1" />);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("sends the typed message with the correct payload and clears the input", async () => {
    const user = userEvent.setup();
    render(<MessageInput chatId="c1" />);

    const input = screen.getByPlaceholderText("Type a message");
    await user.type(input, "hello");
    await user.click(screen.getByRole("button"));

    expect(sendData).toHaveBeenCalledWith({
      type: "message:send",
      chatId: "c1",
      userId: 1,
      username: "alice",
      content: "hello",
    });
    expect(input).toHaveValue("");
  });

  it("does not send when the input is empty or whitespace only", async () => {
    const user = userEvent.setup();
    render(<MessageInput chatId="c1" />);

    await user.click(screen.getByRole("button"));
    expect(sendData).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText("Type a message"), "   ");
    await user.click(screen.getByRole("button"));
    expect(sendData).not.toHaveBeenCalled();
  });
});
