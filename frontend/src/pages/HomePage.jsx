import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api/authApi";
import { listRooms } from "../api/roomsApi";
import Sidebar from "../components/Sidebar";
import "./HomePage.css";

export default function HomePage() {
    const navigate = useNavigate();
    const [state, setState] = useState({
        status: "loading",
        user: null,
        error: "",
    });
    const [rooms, setRooms] = useState([]);
    const [roomsState, setRoomsState] = useState({ loading: true, error: "" });

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const { data } = await fetchMe();
                if (!active) return;
                setState({ status: "ready", user: data, error: "" });
            } catch (error) {
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
                return;
            }

            setRoomsState({ loading: true, error: "" });
            try {
                const { data } = await listRooms();
                if (!active) return;
                setRooms(data);
                setRoomsState({ loading: false, error: "" });
            } catch (error) {
                if (!active) return;
                setRoomsState({
                    loading: false,
                    error:
                        error?.response?.data?.message ||
                        "Unable to load rooms right now.",
                });
            }
        }

        load();

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
                                {roomsState.loading && (
                                    <p className="panel-text">Loading rooms...</p>
                                )}
                                {roomsState.error && (
                                    <p className="panel-text">{roomsState.error}</p>
                                )}
                                {!roomsState.loading && !roomsState.error && rooms.length === 0 && (
                                    <p className="panel-text">No rooms yet. Start your first chat.</p>
                                )}
                                {!roomsState.loading && !roomsState.error && rooms.length > 0 && (
                                    <div className="home-room-list">
                                        {rooms.slice(0, 4).map((room) => (
                                            <button
                                                key={room.id}
                                                className="home-room-chip"
                                                type="button"
                                                onClick={() => navigate(`/rooms/${room.id}`)}
                                            >
                                                {room.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
