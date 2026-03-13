import { useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { uploadAvatar } from "../api/usersApi";
import { API_BASE } from "../api/client";
import "./SettingsPage.css";

export default function SettingsPage() {
    const username = localStorage.getItem("authUsername") || "User";
    const email = localStorage.getItem("authEmail") || "";
    const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("authAvatarUrl") || "");
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState(null); // { type: "ok"|"err", text }
    const fileInputRef = useRef(null);

    function showToast(type, text) {
        setToast({ type, text });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleAvatarFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { showToast("err", "Images only."); return; }
        if (file.size > 2 * 1024 * 1024) { showToast("err", "Max file size is 2MB."); return; }

        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const { data } = await uploadAvatar(formData);
            setAvatarUrl(data.avatarUrl);
            localStorage.setItem("authAvatarUrl", data.avatarUrl);
            window.dispatchEvent(new CustomEvent("avatarUpdated"));
            showToast("ok", "Avatar updated!");
        } catch {
            showToast("err", "Upload failed. Please try again.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    const initial = username.charAt(0).toUpperCase();

    return (
        <div className="settings-shell">
            <Sidebar />
            <div className="settings-container">
                <h1 className="settings-title">Settings</h1>

                <section className="settings-section">
                    <h2 className="settings-section-title">Profile</h2>

                    <div className="settings-avatar-row">
                        <div className="settings-avatar-wrap">
                            <div className="settings-avatar">
                                {avatarUrl
                                    ? <img src={avatarUrl.startsWith("/") ? `${API_BASE}${avatarUrl}` : avatarUrl} alt={username} className="settings-avatar-img" />
                                    : <span className="settings-avatar-initial">{initial}</span>
                                }
                            </div>
                            <button
                                className="settings-avatar-change"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                title="Change avatar"
                            >
                                {uploading ? "Uploading…" : "Change photo"}
                            </button>
                            <p className="settings-avatar-hint">JPG, PNG or GIF · Max 2 MB</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleAvatarFile}
                            />
                        </div>

                        <div className="settings-profile-info">
                            <div className="settings-field">
                                <label className="settings-label">Username</label>
                                <div className="settings-value">{username}</div>
                            </div>
                            <div className="settings-field">
                                <label className="settings-label">Email</label>
                                <div className="settings-value">{email}</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {toast && (
                <div className={`settings-toast settings-toast--${toast.type}`}>
                    {toast.text}
                </div>
            )}
        </div>
    );
}
