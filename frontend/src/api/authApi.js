import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export function register(data) {
    return api.post("/api/auth/register", data);
}
export function login(data) {
    return api.post("/api/auth/login", data);
}

export function fetchMe() {
    return api.get("/api/me");
}

