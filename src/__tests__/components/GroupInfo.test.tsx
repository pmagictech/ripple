import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GroupInfoPanel from "../../components/GroupInfo";
import { useStore } from "../../store";
import { makeChat, makeMember } from "../helpers/utils";

// NOTE: like ChatHeader, GroupInfo is unwired and depends on the missing
// `updateRightPanelState` store action. Tests cover rendering and document the bug.

describe("GroupInfoPanel", () => {
  beforeEach(() => {
    useStore.setState({ chats: [], activeChatId: null });
  });

  it("renders nothing when there is no active chat", () => {
    const { container } = render(<GroupInfoPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the chat name, participant count and members", () => {
    useStore.setState({
      chats: [
        makeChat({
          id: "c1",
          name: "Team",
          members: [
            makeMember({ username: "alice", isAdmin: true }),
            makeMember({ username: "bob", isAdmin: false }),
          ],
        }),
      ],
      activeChatId: "c1",
    });
    render(<GroupInfoPanel />);

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("2 participants")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Group admin")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Participant")).toBeInTheDocument();
  });

  it("falls back to 'No description' when none is set", () => {
    useStore.setState({
      chats: [makeChat({ id: "c1", name: "Team", description: undefined })],
      activeChatId: "c1",
    });
    render(<GroupInfoPanel />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("KNOWN BUG: the store action its Back button needs does not exist", () => {
    // closePanel calls store.updateRightPanelState(null), which the store never
    // defines, so clicking Back would throw at runtime. Asserting the missing
    // action documents the bug without triggering React's uncaught-error path.
    const state = useStore.getState() as unknown as Record<string, unknown>;
    expect(state.updateRightPanelState).toBeUndefined();
  });
});
