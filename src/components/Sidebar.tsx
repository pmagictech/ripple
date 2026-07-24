import { useStore } from "../store";
import ChatListItem from "./ChatListItem";
import ConnectionBanner from "./ConnectionBanner";

export default function Sidebar() {
  const chats = useStore((s) => s.chats);
  console.log("Rendering Sidebar with chats:", chats);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center bg-gray-100 p-4">
        <div className="font-medium">Chats</div>
      </div>

      <ConnectionBanner />

      <div className="flex-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} />
        ))}
      </div>
    </div>
  );
}
