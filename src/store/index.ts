import { create } from "zustand";
import type { Chat, Message } from "../types";
import { sendData } from "../lib/client";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface Store {
  isAuthenticated: boolean;
  user: { id: number; username: string } | null;
  connectionStatus: ConnectionStatus;
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;

  login: (user: { id: number; username: string }) => void;
  updateAuthStatus: (isAuthenticated: boolean) => void;
  setActiveChat: (id: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;

  addChat: (chat: Chat) => void;
  addMessage: (msg: Message) => void;
}

export const useStore = create<Store>()((set, _get) => ({
  isAuthenticated: false,
  user: null,
  chats: [],
  messages: {},

  activeChatId: null,
  connectionStatus: "disconnected",
  rightPanelState: null,

  updateAuthStatus: (isAuthenticated) => set({ isAuthenticated }),
  setActiveChat: (id) => set({ activeChatId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  login: (user) => {
    set({ user });
    sendData({
      type: "auth",
      ...user,
    });
  },

  addChat: (chat) =>
    set((state) => ({
      chats: [...state.chats, chat],
      messages: { ...state.messages, [chat.id]: [] },
    })),
  addMessage: (msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [msg.chatId]: [...(state.messages[msg.chatId] || []), msg],
      },
    })),
}));
