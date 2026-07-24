import type { Chat } from "../types";
import { useStore } from "../store";

export default function ChatListItem({ chat }: { chat: Chat }) {
  const activeChatId = useStore((s) => s.activeChatId);
  const setActiveChat = useStore((s) => s.setActiveChat);

  const isActive = activeChatId === chat.id;

  return (
    <div
      onClick={() => setActiveChat(isActive ? null : chat.id)}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ${
        isActive ? "bg-gray-300/40" : "hover:bg-gray-200/40"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm">
        {chat.name[0]}
      </div>

      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{chat.name}</div>
      </div>
    </div>
  );
}
