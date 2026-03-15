import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let refreshQueue = []; // { resolve, reject } waiting for the new token

async function clearAuth() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
        try {
            await axios.post(`${API_BASE}/api/auth/logout`, { refreshToken });
        } catch { /* ignore — token may already be invalid */ }
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authUsername");
    localStorage.removeItem("authEmail");
    localStorage.removeItem("authAvatarUrl");
    window.location.href = "/login";
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
            await clearAuth();
            return Promise.reject(error);
        }

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return api(original);
            }).catch(() => Promise.reject(error));
        }

        original._retry = true;
        isRefreshing = true;

        try {
            const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("refreshToken", data.refreshToken);

            refreshQueue.forEach(({ resolve }) => resolve(data.token));
            refreshQueue = [];

            original.headers.Authorization = `Bearer ${data.token}`;
            return api(original);
        } catch {
            refreshQueue.forEach(({ reject }) => reject());
            refreshQueue = [];
            await clearAuth();
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
