import api from "./client";

export function register(data) {
    return api.post("/api/auth/register", data);
}
export function login(data) {
    return api.post("/api/auth/login", data);
}

export function fetchMe() {
    return api.get("/api/me");
}

