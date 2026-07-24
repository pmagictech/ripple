import { useStore } from "../store";

export function handleMessage(event: MessageEvent) {
  const data = JSON.parse(event.data);
  const store = useStore.getState();
  console.log("Received WebSocket message:", data);

  switch (data.type) {
    case "auth:success":
      console.log("Authentication successful:", data);
      store.updateAuthStatus(true);
      break;

    case "chat:add":
      console.log("Adding new chat:", data);
      store.addChat(data.payload);
      break;

    case "message:add":
      store.addMessage(data.payload);
      break;

    case "message:status":
      store.updateMessageStatus(data.payload.id, data.payload.status);
      break;
  }
}
