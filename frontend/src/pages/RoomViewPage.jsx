import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getRoom } from "../api/roomsApi";
import { listMessages, sendMessage } from "../api/messagesApi";
import { createStompClient } from "../api/wsClient";
import "./RoomViewPage.css";

export default function RoomViewPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState({ loading: true, error: "" });
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const username = localStorage.getItem("authUsername") || "You";
    const token = localStorage.getItem("authToken");
    const userId = token ? parseJwt(token)?.sub : null;
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);

    useEffect(() => {
        async function loadRoom() {
            try {
                const { data } = await getRoom(id);
                setRoom(data);
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

    useEffect(() => {
        async function loadMessages() {
            try {
                const { data } = await listMessages(id, { page: 0, size: 50 });
                const normalized = data.messages
                    .slice()
                    .reverse()
                    .map((msg) => mapMessage(msg, userId, username));
                setMessages(normalized);
            } catch (error) {
                setState((prev) => ({
                    ...prev,
                    error:
                        error?.response?.data?.message ||
                        "Unable to load messages right now.",
                }));
            }
        }

        if (id) loadMessages();
    }, [id, userId, username]);

    useEffect(() => {
        if (!id || !token) return;

        const client = createStompClient(token);
        client.onConnect = () => {
            subscriptionRef.current = client.subscribe(
                `/topic/rooms/${id}`,
                (message) => {
                    const payload = JSON.parse(message.body);
                    setMessages((prev) => [
                        ...prev,
                        mapMessage(payload, userId, username),
                    ]);
                }
            );
        };
        client.onStompError = () => {};

        client.activate();
        clientRef.current = client;

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [id, token, userId, username]);

    function handleSend(event) {
        event.preventDefault();
        const text = draft.trim();
        if (!text) return;

        const client = clientRef.current;
        if (client && client.connected) {
            client.publish({
                destination: `/app/rooms/${id}/send`,
                body: JSON.stringify({ content: text }),
            });
            setDraft("");
            return;
        }

        sendMessage(id, { content: text })
            .then(({ data }) => {
                setMessages((prev) => [
                    ...prev,
                    mapMessage(data, userId, username),
                ]);
                setDraft("");
            })
            .catch(() => {
                setState((prev) => ({
                    ...prev,
                    error: "Message failed to send.",
                }));
            });
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
                        {state.loading && <p className="panel-text">Loading room...</p>}
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

function parseJwt(token) {
    try {
        const payload = token.split(".")[1];
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
        return null;
    }
}

function mapMessage(message, userId, username) {
    const isMe = userId && String(message.senderId) === String(userId);
    const author = isMe ? username : message.senderUsername || `User ${message.senderId}`;
    const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return {
        id: message.id,
        author,
        content: message.content,
        time: timestamp,
        isMe,
    };
}
