import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true
});

export function register(data) {
    return api.post("/api/auth/register", data);
}
