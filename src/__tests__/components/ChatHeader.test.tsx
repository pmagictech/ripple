import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatHeader from "../../components/ChatHeader";
import { useStore } from "../../store";
import { makeChat } from "../helpers/utils";

// NOTE: ChatHeader is not wired into the running app and relies on a store
// action (`updateRightPanelState`) that does not exist. These tests cover the
// render paths and *document* that known bug rather than fixing it.

describe("ChatHeader", () => {
  beforeEach(() => {
    useStore.setState({ chats: [], activeChatId: null });
  });

  it("renders nothing when there is no active chat", () => {
    const { container } = render(<ChatHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the active chat's name", () => {
    useStore.setState({
      chats: [makeChat({ id: "c1", name: "Team" })],
      activeChatId: "c1",
    });
    render(<ChatHeader />);
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Click for group info")).toBeInTheDocument();
  });

  it("KNOWN BUG: the store action its click handler needs does not exist", () => {
    // ChatHeader's onClick calls store.updateRightPanelState("groupInfo"), but
    // the store never defines that action, so clicking would throw at runtime.
    // We assert the missing action rather than click (React rethrows handler
    // errors as uncaught exceptions, which can't be caught with toThrow here).
    const state = useStore.getState() as unknown as Record<string, unknown>;
    expect(state.updateRightPanelState).toBeUndefined();
  });
});
