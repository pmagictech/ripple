import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleMessage } from "../../lib/handlers";
import { useStore } from "../../store";
import { makeChat, makeMessage } from "../helpers/utils";

// `login` inside the store reaches into the WebSocket client; keep it inert.
vi.mock("../../lib/client", () => ({ sendData: vi.fn() }));

/** Build a fake MessageEvent carrying a JSON-encoded payload. */
function event(data: unknown): MessageEvent {
  return { data: JSON.stringify(data) } as MessageEvent;
}

describe("handleMessage", () => {
  beforeEach(() => {
    useStore.setState({
      isAuthenticated: false,
      user: null,
      chats: [],
      messages: {},
      activeChatId: null,
      connectionStatus: "disconnected",
    });
  });

  it("auth:success flips authentication on", () => {
    const spy = vi.spyOn(useStore.getState(), "updateAuthStatus");
    handleMessage(event({ type: "auth:success" }));

    expect(spy).toHaveBeenCalledWith(true);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });

  it("chat:add adds the chat from the payload", () => {
    const chat = makeChat({ id: "c1" });
    const spy = vi.spyOn(useStore.getState(), "addChat");
    handleMessage(event({ type: "chat:add", payload: chat }));

    expect(spy).toHaveBeenCalledWith(chat);
    expect(useStore.getState().chats).toEqual([chat]);
  });

  it("message:add adds the message from the payload", () => {
    const msg = makeMessage({ chatId: "c1" });
    const spy = vi.spyOn(useStore.getState(), "addMessage");
    handleMessage(event({ type: "message:add", payload: msg }));

    expect(spy).toHaveBeenCalledWith(msg);
    expect(useStore.getState().messages["c1"]).toEqual([msg]);
  });

  it("ignores unknown message types without throwing", () => {
    expect(() =>
      handleMessage(event({ type: "totally:unknown", payload: {} })),
    ).not.toThrow();
    expect(useStore.getState().chats).toEqual([]);
  });

  // --- Documenting a known bug (see plan) ---
  it("message:status THROWS because the store has no updateMessageStatus action", () => {
    // KNOWN BUG: handlers.ts dispatches to store.updateMessageStatus, which is
    // not defined on the store. This test pins the current (broken) behaviour.
    expect(() =>
      handleMessage(
        event({ type: "message:status", payload: { id: 1, status: "read" } }),
      ),
    ).toThrow(TypeError);
  });
});
