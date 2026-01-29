import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { createRoom, joinRoom, listRooms, searchPublicRooms } from "../api/roomsApi";
import "./RoomsPage.css";

export default function RoomsPage() {
    const navigate = useNavigate();
    const username = localStorage.getItem("authUsername") || "You";
    const [roomName, setRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [joinValue, setJoinValue] = useState("");
    const [status, setStatus] = useState({ type: "", text: "" });
    const [rooms, setRooms] = useState([]);
    const [roomsState, setRoomsState] = useState({ loading: true, error: "" });
    const [publicQuery, setPublicQuery] = useState("");
    const [publicRooms, setPublicRooms] = useState([]);
    const [publicState, setPublicState] = useState({
        loading: true,
        error: "",
        page: 0,
        size: 6,
        total: 0,
    });

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
        loadPublicRooms(0, publicQuery);
    }, []);

    async function loadPublicRooms(page = 0, query = publicQuery) {
        try {
            setPublicState((prev) => ({ ...prev, loading: true, error: "" }));
            const { data } = await searchPublicRooms({
                query,
                page,
                size: publicState.size,
            });
            setPublicRooms(data.rooms);
            setPublicState((prev) => ({
                ...prev,
                loading: false,
                page: data.page,
                size: data.size,
                total: data.total,
            }));
        } catch (error) {
            setPublicState((prev) => ({
                ...prev,
                loading: false,
                error:
                    error?.response?.data?.message ||
                    "Unable to load public rooms right now.",
            }));
        }
    }

    async function handleCreateRoom() {
        const name = roomName.trim();
        if (!name) {
            setStatus({ type: "err", text: "Enter a room name first." });
            return;
        }

        try {
            await createRoom({ name, isPrivate });
            setRoomName("");
            setIsPrivate(false);
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

    async function handleJoinPublicRoom(roomId, roomNameValue) {
        try {
            await joinRoom(roomId);
            setStatus({ type: "ok", text: `Joined "${roomNameValue}".` });
            loadRooms();
            loadPublicRooms(0, publicQuery);
            navigate(`/rooms/${roomId}`);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to join room.";
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
                            <p className="room-kicker">Room hub</p>
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
                                    <button
                                        className="btn-secondary room-all"
                                        type="button"
                                        onClick={() => {
                                            setPublicQuery("");
                                            loadPublicRooms(0, "");
                                        }}
                                    >
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
                                            <label className="room-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={isPrivate}
                                                    onChange={(event) =>
                                                        setIsPrivate(event.target.checked)
                                                    }
                                                />
                                                Private
                                            </label>
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
                                                value={joinValue}
                                                onChange={(event) => setJoinValue(event.target.value)}
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

                        <section className="room-card room-list-card room-public-card">
                            <div className="room-list-head">
                                <div>
                                    <h2 className="panel-title">Discover public rooms</h2>
                                    <p className="panel-text">
                                        Search open rooms you have not joined yet.
                                    </p>
                                </div>
                                <button
                                    className="room-link"
                                    type="button"
                                    onClick={() => {
                                        setPublicQuery("");
                                        loadPublicRooms(0, "");
                                    }}
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="room-public-search">
                                <input
                                    className="room-input"
                                    placeholder="Search public rooms"
                                    value={publicQuery}
                                    onChange={(event) => setPublicQuery(event.target.value)}
                                />
                                <button
                                    className="btn-secondary"
                                    type="button"
                                    onClick={() => loadPublicRooms(0, publicQuery)}
                                >
                                    Search
                                </button>
                            </div>

                            {publicState.loading && (
                                <p className="panel-text">Loading public rooms...</p>
                            )}

                            {publicState.error && (
                                <p className="panel-text">{publicState.error}</p>
                            )}

                            {!publicState.loading &&
                                !publicState.error &&
                                publicRooms.length === 0 && (
                                    <p className="panel-text">
                                        No public rooms match that search.
                                    </p>
                                )}

                            {!publicState.loading &&
                                !publicState.error &&
                                publicRooms.length > 0 && (
                                    <div className="room-list">
                                        {publicRooms.map((room) => (
                                            <div className="room-row" key={room.id}>
                                                <div className="room-row-main">
                                                    <span className="room-row-title">
                                                        {room.name}
                                                    </span>
                                                    <span className="room-row-meta">Public room</span>
                                                </div>
                                                <button
                                                    className="btn-secondary room-open"
                                                    type="button"
                                                    onClick={() => handleJoinPublicRoom(room.id, room.name)}
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                            <div className="room-public-pager">
                                <span className="room-pager-meta">
                                    Showing {publicRooms.length} of {publicState.total}
                                </span>
                                <div className="room-pager-actions">
                                    <button
                                        className="btn-secondary"
                                        type="button"
                                        disabled={publicState.page <= 0 || publicState.loading}
                                        onClick={() =>
                                            loadPublicRooms(publicState.page - 1, publicQuery)
                                        }
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        type="button"
                                        disabled={
                                            publicState.loading ||
                                            (publicState.page + 1) * publicState.size >=
                                                publicState.total
                                        }
                                        onClick={() =>
                                            loadPublicRooms(publicState.page + 1, publicQuery)
                                        }
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
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
