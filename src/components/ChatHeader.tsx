import { useStore } from "../store";

export default function ChatHeader() {
  const activeChatId = useStore((s) => s.activeChatId);

  const chat = useStore((s) => s.chats.find((c) => c.id === activeChatId));

  const updateRightPanelState = useStore((s) => s.updateRightPanelState);

  const openGroupInfo = () => updateRightPanelState("groupInfo");

  if (!chat) {
    return null;
  }

  return (
    <button
      onClick={openGroupInfo}
      className="flex h-16 items-center gap-3 border-b border-gray-200 bg-[#f0f2f5] px-4 text-left hover:bg-[#e9edef]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
        {chat.name[0]}
      </div>

      <div>
        <div className="font-medium">{chat.name}</div>

        <div className="text-xs text-gray-500">Click for group info</div>
      </div>
    </button>
  );
}
