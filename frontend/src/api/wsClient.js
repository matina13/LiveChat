import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export function createStompClient(token) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    let reconnectAttempts = 0;
    let reconnectTimer = null;

    const client = new Client({
        webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 0, // manual backoff below
        debug: () => {},
    });

    client._scheduleReconnect = () => {
        if (reconnectTimer || !client.active) return;
        const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
        reconnectAttempts++;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (client.active) client.activate();
        }, delay);
    };

    client._resetReconnect = () => {
        reconnectAttempts = 0;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    };

    return client;
}
