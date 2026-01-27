import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { listRooms } from "../api/roomsApi";
import "./RoomViewPage.css";

const seedMessages = [
    {
        id: 1,
        author: "Amir",
        content: "Morning! Any updates on the roadmap?",
        time: "09:12",
    },
    {
        id: 2,
        author: "Lea",
        content: "I shared notes in the doc. We can review after standup.",
        time: "09:13",
    },
];

export default function RoomViewPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState({ loading: true, error: "" });
    const [messages, setMessages] = useState(seedMessages);
    const [draft, setDraft] = useState("");
    const username = localStorage.getItem("authUsername") || "You";

    useEffect(() => {
        async function loadRoom() {
            try {
                const { data } = await listRooms();
                const found = data.find((item) => String(item.id) === String(id));
                if (!found) {
                    setState({ loading: false, error: "Room not found." });
                    return;
                }
                setRoom(found);
                setState({ loading: false, error: "" });
            } catch (error) {
                setState({
                    loading: false,
                    error:
                        error?.response?.data?.message ||
                        "Unable to load room right now.",
                });
            }
        }

        loadRoom();
    }, [id]);

    function handleSend(event) {
        event.preventDefault();
        const text = draft.trim();
        if (!text) return;

        const timestamp = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                author: username,
                content: text,
                time: timestamp,
                isMe: true,
            },
        ]);
        setDraft("");
    }

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="app-main">
                <div className="room-view">
                    <header className="room-view-header">
                        <button className="room-back" type="button" onClick={() => navigate("/rooms")}>
                            Back to rooms
                        </button>
                        <div>
                            <p className="room-kicker">Room</p>
                            <h1 className="room-title">{room?.name || "Loading..."}</h1>
                        </div>
                    </header>

                    <section className="room-view-card">
                        {state.loading && <p className="panel-text">Loading room…</p>}
                        {!state.loading && state.error && (
                            <p className="panel-text">{state.error}</p>
                        )}
                        {!state.loading && !state.error && room && (
                            <div className="room-chat">
                                <div className="room-chat-meta">
                                    <span>{room.isPrivate ? "Private room" : "Public room"}</span>
                                    <span>Room ID: {room.id}</span>
                                </div>

                                <div className="room-chat-stream">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`chat-bubble ${msg.isMe ? "chat-bubble--me" : ""}`}
                                        >
                                            <div className="chat-bubble-head">
                                                <span className="chat-bubble-author">{msg.author}</span>
                                                <span className="chat-bubble-time">{msg.time}</span>
                                            </div>
                                            <p className="chat-bubble-text">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <form className="room-chat-input" onSubmit={handleSend}>
                                    <input
                                        className="room-chat-field"
                                        placeholder="Type a message"
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                    />
                                    <button className="btn-primary room-chat-send" type="submit">
                                        Send
                                    </button>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
