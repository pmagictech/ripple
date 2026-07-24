import { useEffect } from "react";
import { useStore } from "./store";
import { createConnection } from "./lib/client";
import AuthForm from "./components/AuthForm";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import SplashScreen from "./components/SplastScreen";

export default function App() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  useEffect(() => {
    console.log("Initializing WebSocket connection...");
    const ws = createConnection();

    return () => {
      console.log("Cleaning up WebSocket connection...");
      ws.onclose = null;
      ws.close();
    };
  }, []);

  if (!user) {
    return <AuthForm />;
  }

  if (!isAuthenticated) {
    return <SplashScreen />;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex min-h-screen w-full bg-white shadow-xl">
        {/* LEFT */}
        <div className="flex w-80 flex-col border-r border-black/10 bg-white">
          <Sidebar />
        </div>

        {/* RIGHT */}
        <div className="flex flex-1 flex-col bg-whatsapp/90">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
