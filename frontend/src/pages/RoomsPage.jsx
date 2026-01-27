import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { createRoom, listRooms } from "../api/roomsApi";
import "./RoomsPage.css";

export default function RoomsPage() {
    const navigate = useNavigate();
    const username = localStorage.getItem("authUsername") || "You";
    const [roomName, setRoomName] = useState("");
    const [status, setStatus] = useState({ type: "", text: "" });
    const [rooms, setRooms] = useState([]);
    const [roomsState, setRoomsState] = useState({ loading: true, error: "" });

    async function loadRooms() {
        try {
            setRoomsState({ loading: true, error: "" });
            const { data } = await listRooms();
            setRooms(data);
            setRoomsState({ loading: false, error: "" });
        } catch (error) {
            setRoomsState({
                loading: false,
                error:
                    error?.response?.data?.message ||
                    "Unable to load rooms right now.",
            });
        }
    }

    useEffect(() => {
        loadRooms();
    }, []);

    async function handleCreateRoom() {
        const name = roomName.trim();
        if (!name) {
            setStatus({ type: "err", text: "Enter a room name first." });
            return;
        }

        try {
            await createRoom({ name });
            setRoomName("");
            setStatus({ type: "ok", text: `Room "${name}" created.` });
            loadRooms();
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to create room. Try a different name.";
            setStatus({ type: "err", text: message });
        }
    }

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="app-main">
                <div className="room-page">
                    <header className="room-header">
                        <div>
                            <p className="room-kicker">Rooms</p>
                            <h1 className="room-title">Pick a room</h1>
                            <p className="room-subtitle">
                                Create one, join by invite, or jump back in.
                            </p>
                        </div>
                        <div className="room-status">
                            <span className="room-dot" />
                            Signed in as {username}
                        </div>
                    </header>

                    <main className="room-main">
                        <section className="room-card">
                            <div className="room-actions">
                                <div className="room-actions-head">
                                    <div>
                                        <h2 className="panel-title">Create or join</h2>
                                        <p className="panel-text">
                                            Welcome back, {username}. Start a room or join an existing one.
                                        </p>
                                    </div>
                                    <button className="btn-secondary room-all" type="button">
                                        Browse all
                                    </button>
                                </div>

                                <div className="room-actions-grid">
                                    <div className="room-action-card">
                                        <h3>Create room</h3>
                                        <p>Spin up a new space for a topic or project.</p>
                                        <div className="room-action-field">
                                            <input
                                                className="room-input"
                                                placeholder="Room name"
                                                value={roomName}
                                                onChange={(event) => {
                                                    setRoomName(event.target.value);
                                                    setStatus({ type: "", text: "" });
                                                }}
                                            />
                                            <button
                                                className="btn-primary"
                                                type="button"
                                                onClick={handleCreateRoom}
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </div>

                                    <div className="room-action-card">
                                        <h3>Join room</h3>
                                        <p>Use an invite code or a room name.</p>
                                        <div className="room-action-field">
                                            <input
                                                className="room-input"
                                                placeholder="Invite code or name"
                                            />
                                            <button className="btn-primary" type="button">
                                                Join
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="room-card room-list-card">
                            <div className="room-list-head">
                                <h2 className="panel-title">Your rooms</h2>
                                <button className="room-link" type="button" onClick={loadRooms}>
                                    Refresh
                                </button>
                            </div>

                            {roomsState.loading && (
                                <p className="panel-text">Loading rooms…</p>
                            )}

                            {roomsState.error && (
                                <p className="panel-text">{roomsState.error}</p>
                            )}

                            {!roomsState.loading && !roomsState.error && rooms.length === 0 && (
                                <p className="panel-text">No rooms yet. Create your first room.</p>
                            )}

                            {!roomsState.loading && !roomsState.error && rooms.length > 0 && (
                                <div className="room-list">
                                    {rooms.map((room) => (
                                        <div className="room-row" key={room.id}>
                                            <div className="room-row-main">
                                                <span className="room-row-title">{room.name}</span>
                                                <span className="room-row-meta">
                                                    {room.isPrivate ? "Private" : "Public"}
                                                </span>
                                            </div>
                                            <button
                                                className="btn-primary room-open"
                                                type="button"
                                                onClick={() => navigate(`/rooms/${room.id}`)}
                                            >
                                                Open
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <aside className="room-side">
                            <div className="room-panel">
                                <div className="room-panel-head">
                                    <h2 className="panel-title">Recent rooms</h2>
                                    <button className="room-link" type="button">
                                        View all
                                    </button>
                                </div>
                                <div className="room-recent">
                                    {rooms.slice(0, 4).map((room) => (
                                        <button
                                            className="room-chip"
                                            key={room.id}
                                            type="button"
                                            onClick={() => navigate(`/rooms/${room.id}`)}
                                        >
                                            {room.name}
                                        </button>
                                    ))}
                                    {rooms.length === 0 && (
                                        <span className="room-empty">No recent rooms yet.</span>
                                    )}
                                </div>
                                <p className="panel-text">
                                    Pick a room to rejoin, or browse the full list.
                                </p>
                            </div>
                        </aside>
                    </main>

                    {status.text && (
                        <p className={`room-status-msg ${status.type === "ok" ? "ok" : "err"}`}>
                            {status.text}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
