import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
