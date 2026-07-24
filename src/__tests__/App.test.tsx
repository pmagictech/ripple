import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";
import { useStore } from "../store";

// App opens a WebSocket in an effect; return a socket-shaped stub so cleanup works.
// `vi.hoisted` keeps the spy available inside the hoisted `vi.mock` factory.
const createConnection = vi.hoisted(() =>
  vi.fn(() => ({ onclose: null, close: vi.fn() })),
);
vi.mock("../lib/client", () => ({
  createConnection,
  sendData: vi.fn(),
  forceReconnect: vi.fn(),
}));

describe("App routing", () => {
  beforeEach(() => {
    useStore.setState({
      user: null,
      isAuthenticated: false,
      chats: [],
      messages: {},
      activeChatId: null,
      connectionStatus: "connected",
    });
  });

  it("opens the WebSocket connection on mount", () => {
    render(<App />);
    expect(createConnection).toHaveBeenCalled();
  });

  it("shows the AuthForm when there is no user", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("shows the SplashScreen when the user is set but not authenticated", () => {
    useStore.setState({ user: { id: 1, username: "alice" }, isAuthenticated: false });
    render(<App />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows the main layout when authenticated", () => {
    useStore.setState({ user: { id: 1, username: "alice" }, isAuthenticated: true });
    render(<App />);
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(
      screen.getByText("Select a chat to start messaging"),
    ).toBeInTheDocument();
  });
});
