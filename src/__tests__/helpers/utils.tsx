import { useStore } from "../../store";
import type { Chat, ChatMember, Message } from "../../types";

/**
 * Minimal stand-in for the browser `WebSocket`, mirroring the surface that
 * `src/lib/client.ts` touches: readyState, send, close, and the four event
 * handler slots. Tests can drive lifecycle transitions by calling the
 * `simulate*` helpers.
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  static get last(): MockWebSocket {
    const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    if (!socket) {
      throw new Error("No MockWebSocket instance has been created yet");
    }
    return socket;
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateError() {
    this.onerror?.();
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

/** The store's initial state, captured before any test mutates it. */
const INITIAL_STATE = useStore.getState();

/** Reset the singleton Zustand store back to its initial state. */
export function resetStore() {
  useStore.setState(INITIAL_STATE, true);
}

let memberSeq = 0;
export function makeMember(overrides: Partial<ChatMember> = {}): ChatMember {
  memberSeq += 1;
  return {
    id: memberSeq,
    username: `user${memberSeq}`,
    isAdmin: false,
    ...overrides,
  };
}

let chatSeq = 0;
export function makeChat(overrides: Partial<Chat> = {}): Chat {
  chatSeq += 1;
  return {
    id: `chat-${chatSeq}`,
    name: `Chat ${chatSeq}`,
    type: "group",
    members: [makeMember()],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

let messageSeq = 0;
export function makeMessage(overrides: Partial<Message> = {}): Message {
  messageSeq += 1;
  return {
    id: messageSeq,
    chatId: "chat-1",
    userId: 1,
    username: "alice",
    content: `message ${messageSeq}`,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}
