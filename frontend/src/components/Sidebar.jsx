import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { IconSettings } from "./icons";
import Avatar from "./Avatar";
import "./Sidebar.css";

function IconChat() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
    );
}

function IconMoon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
    );
}

function IconSun() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
        </svg>
    );
}

function IconLogout() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
        </svg>
    );
}

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem("authUsername") || "U";
    const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("authAvatarUrl") || "");
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem("theme") === "dark";
        document.documentElement.dataset.theme = stored ? "dark" : "";
        return stored;
    });

    // Listen for avatar updates from the settings page
    useEffect(() => {
        function onAvatarUpdated() {
            setAvatarUrl(localStorage.getItem("authAvatarUrl") || "");
        }
        window.addEventListener("avatarUpdated", onAvatarUpdated);
        return () => window.removeEventListener("avatarUpdated", onAvatarUpdated);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showMenu]);

    function toggleTheme() {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "";
        localStorage.setItem("theme", next ? "dark" : "light");
    }

    function logout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authUsername");
        localStorage.removeItem("authEmail");
        localStorage.removeItem("authAvatarUrl");
        navigate("/login");
    }

    const isSettings = location.pathname === "/settings";

    return (
        <aside className="icon-rail">
            <button className="rail-logo" onClick={() => navigate("/home")} title="LiveChat">
                LC
            </button>

            <button
                className={`rail-btn ${!isSettings ? "rail-btn--active" : ""}`}
                title="Chats"
                onClick={() => navigate("/home")}
            >
                <IconChat />
            </button>

            <div className="rail-spacer" />

            <button
                className="rail-btn"
                title={isDark ? "Light mode" : "Dark mode"}
                onClick={toggleTheme}
            >
                {isDark ? <IconSun /> : <IconMoon />}
            </button>

            <button
                className={`rail-btn ${isSettings ? "rail-btn--active" : ""}`}
                title="Settings"
                onClick={() => navigate("/settings")}
            >
                <IconSettings />
            </button>

            <div className="rail-user-wrap" ref={menuRef}>
                <button
                    className="rail-btn rail-btn--user"
                    title={username}
                    onClick={() => setShowMenu((v) => !v)}
                >
                    <Avatar className="rail-avatar" username={username} avatarUrl={avatarUrl} />
                </button>

                {showMenu && (
                    <div className="rail-user-menu">
                        <div className="rail-menu-username">{username}</div>
                        <button className="rail-menu-item" onClick={() => { navigate("/settings"); setShowMenu(false); }}>
                            Settings
                        </button>
                        <button className="rail-menu-item rail-menu-item--danger" onClick={logout}>
                            <IconLogout /> Sign out
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
