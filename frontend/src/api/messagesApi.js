import api from "./client";

export function listMessages(roomId, params) {
    return api.get(`/api/rooms/${roomId}/messages`, { params });
}

export function sendMessage(roomId, data) {
    return api.post(`/api/rooms/${roomId}/messages`, data);
}
