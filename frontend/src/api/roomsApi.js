import api from "./client";

export function createRoom(data)          { return api.post("/api/rooms", data); }
export function listRooms()               { return api.get("/api/rooms"); }
export function getRoom(id)               { return api.get(`/api/rooms/${id}`); }
export function searchPublicRooms(params) { return api.get("/api/rooms/public", { params }); }
export function joinRoom(id)              { return api.post(`/api/rooms/${id}/join`); }
export function leaveRoom(id)             { return api.delete(`/api/rooms/${id}/leave`); }
export function deleteRoom(id)            { return api.delete(`/api/rooms/${id}`); }
export function getRoomMembers(id)        { return api.get(`/api/rooms/${id}/members`); }
export function startDm(targetUserId)     { return api.post(`/api/rooms/dm/${targetUserId}`); }
export function getRoomPresence(id)       { return api.get(`/api/rooms/${id}/presence`); }
export function getPresence()             { return api.get(`/api/rooms/presence`); }
export function inviteToRoom(id, data)    { return api.post(`/api/rooms/${id}/invite`, data); }
