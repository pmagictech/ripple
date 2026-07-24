import { useStore } from "../store";
import MessageItem from "./MessageItem";

export default function MessageList({ chatId }: { chatId: string }) {
  const messages = useStore((s) => s.messages[chatId] || []);

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-4">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
}
