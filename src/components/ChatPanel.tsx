import { useStore } from "../store";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatPanel() {
  const activeChatId = useStore((s) => s.activeChatId);

  if (!activeChatId) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        Select a chat to start messaging
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center bg-gray-100 px-4 shadow-sm">
        Chat
      </div>

      <MessageList chatId={activeChatId} />
      <MessageInput chatId={activeChatId} />
    </div>
  );
}
