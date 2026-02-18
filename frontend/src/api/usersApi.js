import api from "./client";

export function searchUsers(query) { return api.get("/api/users/search", { params: { query } }); }
