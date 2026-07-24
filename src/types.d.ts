export interface ChatMember {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface Chat {
  id: string;
  name: string;
  type: "private" | "group";

  description?: string;

  members: ChatMember[];

  createdAt: string;

  avatar?: string | null;
}

export interface Message {
  id: number;
  chatId: string;
  userId: number;
  username: string;
  content: string;
  createdAt: number;
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface WSBase<T = any> {
  type: string;
  id: string;
  timestamp: number;
  payload: T;
}

// Client → Server
export interface MessageSendPayload {
  tempId: string;
  chatId: string;
  content: string;
}

// Server → Client
export interface MessageAckPayload {
  tempId: string;
  messageId: string;
  status: "sent";
}

export interface MessageNewPayload {
  id: string;
  chatId: string;
  content: string;
  createdAt: number;
  senderId: string;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
