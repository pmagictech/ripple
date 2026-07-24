import { useStore } from "../store";

export default function GroupInfoPanel() {
  const activeChatId = useStore((s) => s.activeChatId);

  const chat = useStore((s) => s.chats.find((c) => c.id === activeChatId));

  const updateRightPanelState = useStore((s) => s.updateRightPanelState);

  const closePanel = () => updateRightPanelState(null);

  if (!chat) {
    return null;
  }

  return (
    <div className="flex w-105 flex-col border-l border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <button onClick={closePanel} className="mr-4 text-gray-600">
          Back
        </button>

        <div className="font-medium">Group info</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center p-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-300 text-4xl">
            {chat.name[0]}
          </div>

          <h2 className="mt-4 text-xl font-medium">{chat.name}</h2>

          <p className="text-sm text-gray-500">
            {chat.members.length} participants
          </p>
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-2 text-xs text-gray-500 uppercase">
            Description
          </div>

          <p className="text-sm">{chat.description || "No description"}</p>
        </div>

        <div className="border-t border-gray-100">
          {chat.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{member.username}</div>

                <div className="text-xs text-gray-500">
                  {member.isAdmin ? "Group admin" : "Participant"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
