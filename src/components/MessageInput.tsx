import { useState } from "react";
import { useStore } from "../store";
import { sendData } from "../lib/client";
import SendIcon from "../icons/SendIcon";

export default function MessageInput({ chatId }: { chatId: string }) {
  const [content, setContent] = useState("");

  const user = useStore((s) => s.user);
  const status = useStore((s) => s.connectionStatus);
  const isConnected = status === "connected";

  const send = () => {
    if (!content.trim()) {
      return;
    }

    sendData({
      type: "message:send",
      chatId,
      userId: user?.id,
      username: user?.username,
      content,
    });

    setContent("");
  };

  return (
    <div className="flex items-center gap-1 p-3">
      <input
        id="message-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 rounded-full bg-white px-4 py-3 text-sm shadow-md outline-none"
        placeholder="Type a message"
      />

      <button
        onClick={send}
        disabled={!isConnected}
        className="rounded-2xl bg-blue-500 p-3 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        <SendIcon />
      </button>
    </div>
  );
}
