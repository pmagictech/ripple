import { useStore } from "../store";
import { handleMessage } from "./handlers";

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let stableTimer: number | null = null;
const STABLE_TIME = 5000; // 5 seconds

const MAX_BACKOFF = 30000;

function getBackoff() {
  console.log(
    `Calculating backoff for attempt ${reconnectAttempts} = ${1000 * 2 ** reconnectAttempts}ms`,
  );
  const base = Math.min(1000 * 2 ** reconnectAttempts, MAX_BACKOFF);

  return Math.floor(base * Math.random());
}

export function createConnection() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket already open, returning existing connection");
    return ws;
  }

  console.log("Connecting to WebSocket...");

  ws = new WebSocket("ws://localhost:8080");
  const { setConnectionStatus } = useStore.getState();

  ws.onopen = () => {
    clearReconnectTimer();
    setConnectionStatus("connected");
    console.log("Connected to WebSocket");

    stableTimer = setTimeout(() => {
      reconnectAttempts = 0;
      console.log("Connection stable, reset attempts");
    }, STABLE_TIME);
  };

  ws.onmessage = handleMessage;

  ws.onerror = () => {
    console.error("WebSocket error");
    setConnectionStatus("error");
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    setConnectionStatus("disconnected");

    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }

    scheduleReconnect();
  };

  return ws;
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  const delay = getBackoff();
  console.log(`Scheduling reconnect in ${delay}ms`);

  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    reconnectTimer = null;
    createConnection();
  }, delay);
}

export function forceReconnect() {
  clearReconnectTimer();
  reconnectAttempts = 0;
  console.log("Forcing WebSocket reconnection...");

  if (ws) {
    try {
      ws.onclose = null; // prevent triggering backoff
      ws.close();
    } catch {}
  }

  ws = null;

  createConnection();
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    console.log("Clearing reconnect timer");
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function sendData(data: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}
