import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api/authApi";
import "./HomePage.css";

export default function HomePage() {
    const navigate = useNavigate();
    const [state, setState] = useState({ status: "loading", user: null, error: "" });

    useEffect(() => {
        let active = true;
        fetchMe()
            .then(({ data }) => {
                if (!active) return;
                setState({ status: "ready", user: data, error: "" });
            })
            .catch(() => {
                if (!active) return;
                localStorage.removeItem("authToken");
                localStorage.removeItem("authUsername");
                localStorage.removeItem("authEmail");
                setState({ status: "error", user: null, error: "Session expired. Please sign in again." });
                navigate("/login");
            });

        return () => {
            active = false;
        };
    }, [navigate]);

    function handleLogout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUsername");
        localStorage.removeItem("authEmail");
        navigate("/login");
    }

    const username = state.user?.username || localStorage.getItem("authUsername");

    return (
        <div className="home-page">
            <header className="home-header">
                <div className="home-brand">LiveChat</div>
                <button className="btn-secondary" onClick={handleLogout}>
                    Log out
                </button>
            </header>

            <main className="home-main">
                <section className="home-card">
                    <h1 className="home-title">Welcome{username ? `, ${username}` : ""}.</h1>
                    <p className="home-subtitle">You are signed in and ready to chat.</p>
                    {state.status === "loading" && <p className="home-note">Checking your session…</p>}
                    <div className="home-actions">
                        <button className="btn-primary">Start a chat</button>
                        <button className="btn-secondary">Find a room</button>
                    </div>
                </section>

                <section className="home-panels">
                    <div className="home-panel">
                        <h2 className="panel-title">Recent rooms</h2>
                        <p className="panel-text">No rooms yet. Start your first chat.</p>
                    </div>
                    <div className="home-panel">
                        <h2 className="panel-title">Quick tip</h2>
                        <p className="panel-text">Invite a friend with a room link once you create one.</p>
                    </div>
                </section>
            </main>
        </div>
    );
}
