import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export function createStompClient(token) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    return new Client({
        webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 5000,
        debug: () => {},
    });
}
