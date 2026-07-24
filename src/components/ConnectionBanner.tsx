import { useStore } from "../store";
import { forceReconnect } from "../lib/client";

export default function ConnectionBanner() {
  const status = useStore((s) => s.connectionStatus);

  if (status === "connected") return null;

  return (
    <div className="flex items-center justify-between border-b border-yellow-300 bg-yellow-100 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-gray-800">
          Computer not connected
        </div>
        <div className="text-xs text-gray-600">
          Make sure your computer has an active internet connection.
        </div>
      </div>

      <button
        onClick={() => {
          forceReconnect();
        }}
        className="text-sm font-medium text-green-600 hover:underline"
      >
        Reconnect
      </button>
    </div>
  );
}
