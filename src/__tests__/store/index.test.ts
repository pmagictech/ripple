import { describe, it, expect, vi, beforeEach } from "vitest";
import { useStore } from "../../store";
import { sendData } from "../../lib/client";
import { makeChat, makeMessage } from "../helpers/utils";

// The store's `login` action calls into the WebSocket client. Mock the whole
// module so no real socket is opened and we can assert the outbound payload.
vi.mock("../../lib/client", () => ({
  sendData: vi.fn(),
}));

describe("store", () => {
  beforeEach(() => {
    // setup.ts resets the store after each test; make the pre-state explicit here too.
    useStore.setState({
      isAuthenticated: false,
      user: null,
      chats: [],
      messages: {},
      activeChatId: null,
      connectionStatus: "disconnected",
    });
  });

  it("has the expected initial state", () => {
    const s = useStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.chats).toEqual([]);
    expect(s.messages).toEqual({});
    expect(s.activeChatId).toBeNull();
    expect(s.connectionStatus).toBe("disconnected");
  });

  it("updateAuthStatus sets the authenticated flag", () => {
    useStore.getState().updateAuthStatus(true);
    expect(useStore.getState().isAuthenticated).toBe(true);

    useStore.getState().updateAuthStatus(false);
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it("setActiveChat sets and clears the active chat id", () => {
    useStore.getState().setActiveChat("chat-42");
    expect(useStore.getState().activeChatId).toBe("chat-42");

    useStore.getState().setActiveChat(null);
    expect(useStore.getState().activeChatId).toBeNull();
  });

  it("setConnectionStatus updates the connection status", () => {
    useStore.getState().setConnectionStatus("connected");
    expect(useStore.getState().connectionStatus).toBe("connected");

    useStore.getState().setConnectionStatus("error");
    expect(useStore.getState().connectionStatus).toBe("error");
  });

  describe("login", () => {
    it("stores the user and sends an auth message", () => {
      const user = { id: 7, username: "alice" };
      useStore.getState().login(user);

      expect(useStore.getState().user).toEqual(user);
      expect(sendData).toHaveBeenCalledWith({
        type: "auth",
        id: 7,
        username: "alice",
      });
    });

    it("does NOT set isAuthenticated (auth is confirmed later by the server)", () => {
      useStore.getState().login({ id: 1, username: "bob" });
      // Documents current behaviour: authentication only flips on `auth:success`.
      expect(useStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("addChat", () => {
    it("appends the chat and initializes an empty message list", () => {
      const chat = makeChat({ id: "c1" });
      useStore.getState().addChat(chat);

      expect(useStore.getState().chats).toEqual([chat]);
      expect(useStore.getState().messages["c1"]).toEqual([]);
    });

    it("keeps existing chats when adding another", () => {
      const a = makeChat({ id: "a" });
      const b = makeChat({ id: "b" });
      useStore.getState().addChat(a);
      useStore.getState().addChat(b);

      expect(useStore.getState().chats.map((c) => c.id)).toEqual(["a", "b"]);
      expect(useStore.getState().messages).toHaveProperty("a");
      expect(useStore.getState().messages).toHaveProperty("b");
    });
  });

  describe("addMessage", () => {
    it("creates the array for a chat that has no messages yet", () => {
      const msg = makeMessage({ chatId: "c1" });
      useStore.getState().addMessage(msg);

      expect(useStore.getState().messages["c1"]).toEqual([msg]);
    });

    it("appends to an existing message list", () => {
      const first = makeMessage({ chatId: "c1", id: 1 });
      const second = makeMessage({ chatId: "c1", id: 2 });
      useStore.getState().addMessage(first);
      useStore.getState().addMessage(second);

      expect(useStore.getState().messages["c1"]).toEqual([first, second]);
    });

    it("keeps messages for different chats separate", () => {
      const m1 = makeMessage({ chatId: "c1", id: 1 });
      const m2 = makeMessage({ chatId: "c2", id: 2 });
      useStore.getState().addMessage(m1);
      useStore.getState().addMessage(m2);

      expect(useStore.getState().messages["c1"]).toEqual([m1]);
      expect(useStore.getState().messages["c2"]).toEqual([m2]);
    });
  });
});
