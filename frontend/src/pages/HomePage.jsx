import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api/authApi";
import Sidebar from "../components/Sidebar";
import "./HomePage.css";

export default function HomePage() {
    const navigate = useNavigate();
    const [state, setState] = useState({
        status: "loading",
        user: null,
        error: "",
    });

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
                setState({
                    status: "error",
                    user: null,
                    error: "Session expired. Please sign in again.",
                });
                navigate("/login");
            });

        return () => {
            active = false;
        };
    }, [navigate]);

    const username = state.user?.username || localStorage.getItem("authUsername");

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="app-main">
                <div className="home-page">
                    <main className="home-main">
                        <section className="home-card">
                            <h1 className="home-title">Welcome{username ? `, ${username}` : ""}.</h1>
                            <p className="home-subtitle">You are signed in and ready to chat.</p>

                            {state.status === "loading" && (
                                <p className="home-note">Checking your session…</p>
                            )}

                            {state.status === "error" && state.error && (
                                <p className="home-note">{state.error}</p>
                            )}

                            <div className="home-actions">
                                <button
                                    className="btn-primary"
                                    type="button"
                                    onClick={() => navigate("/rooms")}
                                >
                                    Start a chat
                                </button>
                                <button className="btn-secondary" type="button"

                                        onClick={() => navigate("/rooms")}
                                        >
                                    Find a room
                                </button>
                            </div>
                        </section>

                        <section className="home-panels">
                            <div className="home-panel">
                                <h2 className="panel-title">Recent rooms</h2>
                                <p className="panel-text">No rooms yet. Start your first chat.</p>
                            </div>

                            <div className="home-panel">
                                <h2 className="panel-title">Quick tip</h2>
                                <p className="panel-text">
                                    Invite a friend with a room link once you create one.
                                </p>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
