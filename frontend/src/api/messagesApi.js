import api from "./client";

export function listMessages(roomId, params)              { return api.get(`/api/rooms/${roomId}/messages`, { params }); }
export function sendMessage(roomId, data)                 { return api.post(`/api/rooms/${roomId}/messages`, data); }
export function editMessage(roomId, messageId, data)      { return api.patch(`/api/rooms/${roomId}/messages/${messageId}`, data); }
export function deleteMessage(roomId, messageId)          { return api.delete(`/api/rooms/${roomId}/messages/${messageId}`); }
export function markRoomRead(roomId)                      { return api.post(`/api/rooms/${roomId}/messages/read`); }
