import { useEffect, useRef, useCallback, useState } from "react";

interface WebSocketMessage {
  type: string;
  data?: unknown;
  message?: string;
}

interface UseWebSocketOptions {
  onContractState?: (data: unknown) => void;
  onActivities?: (data: unknown) => void;
  onLeaderboard?: (data: { up: unknown[]; down: unknown[] }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        options.onConnected?.();
      };

      ws.onclose = () => {
        setIsConnected(false);
        options.onDisconnected?.();

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        options.onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "connected":
              break;
            case "contract_state":
              options.onContractState?.(message.data);
              break;
            case "activities":
              options.onActivities?.(message.data);
              break;
            case "leaderboard":
              options.onLeaderboard?.(message.data as { up: unknown[]; down: unknown[] });
              break;
            default:
              console.log("Unknown WebSocket message:", message.type);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const send = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const requestContractState = useCallback(() => {
    send("get_contract_state");
  }, [send]);

  const requestActivities = useCallback(() => {
    send("get_activities");
  }, [send]);

  const requestLeaderboard = useCallback(() => {
    send("get_leaderboard");
  }, [send]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    requestContractState,
    requestActivities,
    requestLeaderboard,
  };
}
