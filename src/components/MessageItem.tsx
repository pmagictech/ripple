import { useStore } from "../store";
import type { Message } from "../types";

export default function MessageItem({ message }: { message: Message }) {
  const user = useStore((s) => s.user);
  const isOwnMessage = user?.id === message.userId;

  return (
    <div
      className={`flex p-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-2/3 min-w-32 rounded-xl p-2 text-sm ${
          isOwnMessage
            ? "bg-green-200 text-gray-800"
            : "bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200"
        }`}
      >
        {!isOwnMessage && (
          <div className="mb-1 text-sm font-bold text-gray-700">
            {message.username.charAt(0).toUpperCase() +
              message.username.slice(1)}
          </div>
        )}
        <div>{message.content}</div>
        <div className="mt-1 text-right text-xs text-gray-500">
          {new Date(message.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
