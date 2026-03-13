import { API_BASE } from "../api/client";

export default function Avatar({ username, avatarUrl, className }) {
    const src = avatarUrl
        ? (avatarUrl.startsWith("/") ? `${API_BASE}${avatarUrl}` : avatarUrl)
        : null;

    return (
        <div className={className}>
            {src
                ? <img src={src} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                : (username || "?").charAt(0).toUpperCase()
            }
        </div>
    );
}
