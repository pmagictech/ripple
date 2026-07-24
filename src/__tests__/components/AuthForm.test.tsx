import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthForm from "../../components/AuthForm";
import { useStore } from "../../store";

// login() reaches into the WebSocket client; keep it inert for this test.
vi.mock("../../lib/client", () => ({ sendData: vi.fn() }));

function mockFetch(response: unknown) {
  const fn = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(response),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("AuthForm", () => {
  beforeEach(() => {
    useStore.setState({ user: null, isAuthenticated: false });
  });

  it("renders the login form by default", () => {
    render(<AuthForm />);
    expect(
      screen.getByRole("button", { name: "Login" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("toggles between Login and Sign Up", async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(
      screen.getByText("Don't have an account? Sign Up"),
    );
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();

    await user.click(screen.getByText("Already have an account? Login"));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("logs in on a successful response", async () => {
    const fetchMock = mockFetch({ success: true, id: 5, username: "alice" });
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByPlaceholderText("Username"), "alice");
    await user.type(screen.getByPlaceholderText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/websockets/backend/login.php",
      expect.objectContaining({ method: "POST" }),
    );
    expect(useStore.getState().user).toEqual({ id: 5, username: "alice" });
  });

  it("hits the signup endpoint when in Sign Up mode", async () => {
    const fetchMock = mockFetch({ success: true, id: 9, username: "bob" });
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByText("Don't have an account? Sign Up"));
    await user.type(screen.getByPlaceholderText("Username"), "bob");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/websockets/backend/signup.php",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server error message on failure", async () => {
    mockFetch({ success: false, error: "Bad credentials" });
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.type(screen.getByPlaceholderText("Username"), "x");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Bad credentials")).toBeInTheDocument();
    expect(useStore.getState().user).toBeNull();
  });

  it("falls back to a default error message", async () => {
    mockFetch({ success: false });
    const user = userEvent.setup();
    render(<AuthForm />);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Authentication failed. Please try again."),
    ).toBeInTheDocument();
  });
});
