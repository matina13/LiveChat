import api from "./client";

export function createRoom(data) {
    return api.post("/api/rooms", data);
}

export function listRooms() {
    return api.get("/api/rooms");
}

export function getRoom(id) {
    return api.get(`/api/rooms/${id}`);
}

export function searchPublicRooms(params) {
    return api.get("/api/rooms/public", { params });
}

export function joinRoom(id) {
    return api.post(`/api/rooms/${id}/join`);
}
