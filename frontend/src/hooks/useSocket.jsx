import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL, SOCKET_CONFIG } from "../config";
import { useAuth } from "./useAuth";

export const SocketContext = createContext({
  connected:  false,
  lastAlert:  null,
  liveEvents: [],
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [connected,  setConnected]  = useState(false);
  const [lastAlert,  setLastAlert]  = useState(null);
  const [liveEvents, setLiveEvents] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) { setConnected(false); return; }
    const socket = io(SOCKET_URL, SOCKET_CONFIG);
    socket.on("connect",       () => setConnected(true));
    socket.on("disconnect",    () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("new_alert", (data) => {
      const event = { ...data, _id: `${Date.now()}-${Math.random()}` };
      if (data.status === "ATTACK") setLastAlert(data);
      setLiveEvents((prev) => [event, ...prev].slice(0, 100));
    });
    return () => socket.disconnect();
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ connected, lastAlert, liveEvents }}>
      {children}
    </SocketContext.Provider>
  );
}