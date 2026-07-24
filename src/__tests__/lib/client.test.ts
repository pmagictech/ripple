import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockWebSocket } from "../helpers/utils";

// Observe the store writes the client makes without pulling in the real store.
// `vi.hoisted` makes the spy available inside the hoisted `vi.mock` factory.
const setConnectionStatus = vi.hoisted(() => vi.fn());
vi.mock("../../store", () => ({
  useStore: {
    getState: () => ({ setConnectionStatus }),
    // resetStore() in setup.ts calls setState during afterEach.
    setState: vi.fn(),
  },
}));
// The client wires ws.onmessage = handleMessage; we don't exercise it here.
vi.mock("../../lib/handlers", () => ({ handleMessage: vi.fn() }));

// client.ts keeps module-level singletons (ws, reconnectAttempts, timers), so we
// re-import it fresh in every test after resetting the module registry.
async function loadClient() {
  return import("../../lib/client");
}

describe("client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    MockWebSocket.reset();
    vi.stubGlobal("WebSocket", MockWebSocket);
    // Deterministic jitter: getBackoff multiplies the base delay by Math.random().
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    setConnectionStatus.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("createConnection opens a socket to the expected URL", async () => {
    const { createConnection } = await loadClient();
    createConnection();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.last.url).toBe("ws://localhost:8080");
  });

  it("onopen sets status to connected", async () => {
    const { createConnection } = await loadClient();
    createConnection();
    MockWebSocket.last.simulateOpen();

    expect(setConnectionStatus).toHaveBeenCalledWith("connected");
  });

  it("onerror sets status to error", async () => {
    const { createConnection } = await loadClient();
    createConnection();
    MockWebSocket.last.simulateError();

    expect(setConnectionStatus).toHaveBeenCalledWith("error");
  });

  it("returns the existing socket when one is already OPEN", async () => {
    const { createConnection } = await loadClient();
    createConnection();
    MockWebSocket.last.simulateOpen();

    const again = createConnection();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(again).toBe(MockWebSocket.last);
  });

  it("onclose marks disconnected and schedules a reconnect with backoff", async () => {
    const { createConnection } = await loadClient();
    createConnection();
    MockWebSocket.last.simulateClose();

    expect(setConnectionStatus).toHaveBeenCalledWith("disconnected");

    // attempt 0 -> base 1000ms * 0.5 jitter = 500ms. Nothing reconnects early.
    vi.advanceTimersByTime(499);
    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("backoff grows exponentially with each attempt", async () => {
    const { createConnection } = await loadClient();
    createConnection();

    // First close: attempt 0 -> 500ms.
    MockWebSocket.last.simulateClose();
    vi.advanceTimersByTime(500);
    expect(MockWebSocket.instances).toHaveLength(2);

    // Second close: attempt 1 -> base 2000ms * 0.5 = 1000ms.
    MockWebSocket.last.simulateClose();
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("a stable connection resets the backoff attempt counter", async () => {
    const { createConnection } = await loadClient();
    createConnection();

    // Close once so the attempt counter advances to 1.
    MockWebSocket.last.simulateClose();
    vi.advanceTimersByTime(500);
    expect(MockWebSocket.instances).toHaveLength(2);

    // The reconnected socket opens and stays up past STABLE_TIME (5s) -> reset.
    MockWebSocket.last.simulateOpen();
    vi.advanceTimersByTime(5000);

    // Next close should again use attempt-0 timing (500ms), not 1000ms.
    MockWebSocket.last.simulateClose();
    vi.advanceTimersByTime(499);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it("sendData sends JSON only when the socket is OPEN", async () => {
    const { createConnection, sendData } = await loadClient();
    createConnection();

    // Not open yet -> no send.
    sendData({ hello: "world" });
    expect(MockWebSocket.last.send).not.toHaveBeenCalled();

    MockWebSocket.last.simulateOpen();
    sendData({ hello: "world" });
    expect(MockWebSocket.last.send).toHaveBeenCalledWith(
      JSON.stringify({ hello: "world" }),
    );
  });

  it("sendData is a no-op when no socket exists", async () => {
    const { sendData } = await loadClient();
    expect(() => sendData({ a: 1 })).not.toThrow();
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("does not schedule a second reconnect while one is already pending", async () => {
    const { createConnection } = await loadClient();
    createConnection();

    // Two closes before the timer fires: the second scheduleReconnect is a no-op.
    MockWebSocket.last.simulateClose();
    MockWebSocket.last.simulateClose();

    vi.advanceTimersByTime(500);
    // Only one reconnect happened -> one extra socket, not two.
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("forceReconnect clears a pending reconnect timer", async () => {
    const { createConnection, forceReconnect } = await loadClient();
    createConnection();

    // A close schedules a reconnect timer...
    MockWebSocket.last.simulateClose();
    // ...which forceReconnect must clear before creating its own connection.
    forceReconnect();
    expect(MockWebSocket.instances).toHaveLength(2);

    // The previously-scheduled reconnect must NOT also fire.
    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("forceReconnect closes the current socket and opens a new one", async () => {
    const { createConnection, forceReconnect } = await loadClient();
    createConnection();
    MockWebSocket.last.simulateOpen();
    const first = MockWebSocket.last;

    forceReconnect();

    // Old socket's onclose is nulled (to suppress backoff) and it is closed.
    expect(first.onclose).toBeNull();
    expect(first.close).toHaveBeenCalled();
    // A brand-new socket is created immediately.
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.last).not.toBe(first);
  });
});
