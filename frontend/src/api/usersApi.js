import api from "./client";

export function searchUsers(query) { return api.get("/api/users/search", { params: { query } }); }
export function uploadAvatar(formData) { return api.patch("/api/users/me/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } }); }
