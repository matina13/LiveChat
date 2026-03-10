import { useEffect, useRef, useState, useCallback } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import Sidebar from "../components/Sidebar";
import { createRoom, joinRoom, listRooms, searchPublicRooms, getRoom, leaveRoom, deleteRoom, getRoomMembers, startDm, getPresence } from "../api/roomsApi";
import { listMessages, sendMessage, editMessage, deleteMessage, markRoomRead, uploadImage } from "../api/messagesApi";
import { searchUsers } from "../api/usersApi";
import { createStompClient } from "../api/wsClient";
import { API_BASE } from "../api/client";
import "./RoomsPage.css";

function IconPlus() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
    );
}

function IconChat() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
    );
}

function IconCompose() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
    );
}

function IconImage() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
    );
}

// ── Helpers ────────────────────────────────────────────────────
const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u;
function isEmojiOnly(text) {
    return text.trim().length > 0 && EMOJI_ONLY_RE.test(text.trim());
}

function getRoomDisplayName(room) {
    return room.type === "direct" ? (room.otherUsername || "DM") : room.name;
}

function getRoomInitial(room) {
    return getRoomDisplayName(room).charAt(0).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────
export default function RoomsPage() {
    const username = localStorage.getItem("authUsername") || "You";
    const token = localStorage.getItem("authToken");
    const userId = token ? parseJwt(token)?.sub : null;

    // Room creation
    const [roomName, setRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [showNewRoom, setShowNewRoom] = useState(false);

    // DM search
    const [showDmSearch, setShowDmSearch] = useState(false);
    const [dmQuery, setDmQuery] = useState("");
    const [dmResults, setDmResults] = useState([]);
    const [dmLoading, setDmLoading] = useState(false);
    const dmSearchRef = useRef(null);

    // Unread counts  { [roomId]: number }
    const [unreadCounts, setUnreadCounts] = useState({});

    // Rooms list
    const [rooms, setRooms] = useState([]);
    const [roomsState, setRoomsState] = useState({ loading: true, error: "" });

    // Discover
    const [activeTab, setActiveTab] = useState("chats");
    const [publicQuery, setPublicQuery] = useState("");
    const [publicRooms, setPublicRooms] = useState([]);
    const [publicState, setPublicState] = useState({ loading: true, error: "", page: 0, size: 6, total: 0 });

    // Active room
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [activeRoom, setActiveRoom] = useState(null);
    const [roomMembers, setRoomMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageState, setMessageState] = useState({ loading: false, error: "" });
    const [draft, setDraft] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);
    const composerInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState("");

    // Typing
    const [typers, setTypers] = useState({});
    const typerTimersRef = useRef({});
    const lastTypeSentRef = useRef(0);

    // Presence  { userId: boolean }
    const [onlineUsers, setOnlineUsers] = useState({});

    // WS
    const [wsConnected, setWsConnected] = useState(false);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const typingSubRef = useRef(null);
    const presenceSubsRef = useRef({});   // roomId → subscription
    const notifSubRef = useRef(null);
    const resubscribeRef = useRef(null);
    const activeRoomIdRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Toast
    const [toast, setToast] = useState({ type: "", text: "" });
    const toastTimer = useRef(null);

    // ── Helpers ───────────────────────────────────────────────
    function showToast(type, text) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ type, text });
        toastTimer.current = setTimeout(() => setToast({ type: "", text: "" }), 3000);
    }

    function handleTypingEvent(payload) {
        const typerUserId = String(payload.userId);
        if (typerUserId === String(userId)) return;
        const typerUsername = payload.username || "Someone";

        if (typerTimersRef.current[typerUserId]) clearTimeout(typerTimersRef.current[typerUserId]);
        setTypers((prev) => ({ ...prev, [typerUserId]: typerUsername }));
        typerTimersRef.current[typerUserId] = setTimeout(() => {
            setTypers((prev) => { const next = { ...prev }; delete next[typerUserId]; return next; });
            delete typerTimersRef.current[typerUserId];
        }, 3000);
    }

    // ── Data loading ─────────────────────────────────────────
    async function loadRooms() {
        try {
            setRoomsState({ loading: true, error: "" });
            const [{ data }, { data: onlineIds }] = await Promise.all([listRooms(), getPresence()]);
            setRooms(data);
            const counts = {};
            data.forEach((r) => { if (r.unreadCount > 0) counts[r.id] = r.unreadCount; });
            setUnreadCounts(counts);
            const onlineMap = {};
            onlineIds.forEach((id) => { onlineMap[String(id)] = true; });
            setOnlineUsers(onlineMap);
            setRoomsState({ loading: false, error: "" });
            if (!activeRoomId && data.length > 0) setActiveRoomId(data[0].id);
        } catch (err) {
            setRoomsState({ loading: false, error: err?.response?.data?.message || "Unable to load rooms." });
        }
    }

    const loadPublicRooms = useCallback(async (page = 0, query = publicQuery) => {
        try {
            setPublicState((prev) => ({ ...prev, loading: true, error: "" }));
            const { data } = await searchPublicRooms({ query, page, size: 6 });
            setPublicRooms(data.rooms);
            setPublicState((prev) => ({ ...prev, loading: false, page: data.page, size: data.size, total: data.total }));
        } catch (err) {
            setPublicState((prev) => ({ ...prev, loading: false, error: err?.response?.data?.message || "Unable to load public rooms." }));
        }
    }, [publicQuery]);

    useEffect(() => {
        loadRooms();
        loadPublicRooms(0, "");
    }, []);

    useEffect(() => {
        if (!showEmojiPicker) return;
        function handleClickOutside(e) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker]);

    // ── Active room + messages + members ────────────────────
    useEffect(() => {
        if (!activeRoomId) {
            setActiveRoom(null);
            setMessages([]);
            setRoomMembers([]);
            return;
        }

        let active = true;
        async function load() {
            setMessages([]);
            setMessageState({ loading: true, error: "" });
            try {
                const { data: room } = await getRoom(activeRoomId);
                if (!active) return;
                setActiveRoom(room);
            } catch (err) {
                if (!active) return;
                setMessageState({ loading: false, error: err?.response?.data?.message || "Unable to load room." });
                return;
            }
            try {
                const [msgRes, membersRes] = await Promise.all([
                    listMessages(activeRoomId, { page: 0, size: 50 }),
                    getRoomMembers(activeRoomId),
                ]);
                if (!active) return;
                const normalized = msgRes.data.messages.slice().reverse().map((m) => mapMessage(m, userId, username));
                setMessages((prev) => {
                    const loadedIds = new Set(normalized.map((m) => m.id));
                    const live = prev.filter((m) => !loadedIds.has(m.id));
                    return [...normalized, ...live];
                });
                setRoomMembers(membersRes.data);
                setMessageState({ loading: false, error: "" });
            } catch (err) {
                if (!active) return;
                setMessageState({ loading: false, error: err?.response?.data?.message || "Unable to load messages." });
            }
        }
        load();
        return () => { active = false; };
    }, [activeRoomId, userId, username]);

    // ── Clear typers on room change ──────────────────────────
    useEffect(() => {
        Object.values(typerTimersRef.current).forEach(clearTimeout);
        typerTimersRef.current = {};
        setTypers({});
    }, [activeRoomId]);

    // ── Auto-scroll ──────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Close DM search on outside click ────────────────────
    useEffect(() => {
        if (!showDmSearch) return;
        function handleClick(e) {
            if (dmSearchRef.current && !dmSearchRef.current.contains(e.target)) {
                setShowDmSearch(false);
                setDmQuery("");
                setDmResults([]);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showDmSearch]);

    // ── WebSocket: one persistent client per session ─────────
    useEffect(() => {
        if (!token) return;

        const client = createStompClient(token);

        function resubscribe(roomId) {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
            typingSubRef.current?.unsubscribe();
            typingSubRef.current = null;
            if (!roomId || !client.connected) return;

            subscriptionRef.current = client.subscribe(
                `/topic/rooms/${roomId}`,
                (msg) => {
                    const payload = JSON.parse(msg.body);
                    if (payload.type === "edit") {
                        setMessages((prev) => prev.map((m) =>
                            m.id === payload.id
                                ? { ...m, content: payload.content, editedAt: payload.editedAt }
                                : m
                        ));
                    } else if (payload.type === "delete") {
                        setMessages((prev) => prev.map((m) =>
                            m.id === payload.id ? { ...m, deleted: true, content: null } : m
                        ));
                    } else {
                        setMessages((prev) => [...prev, mapMessage(payload, userId, username)]);
                    }
                }
            );
            typingSubRef.current = client.subscribe(
                `/topic/rooms/${roomId}/typing`,
                (msg) => handleTypingEvent(JSON.parse(msg.body))
            );
        }

        client.onConnect = () => {
            client._resetReconnect();
            setWsConnected(true);

            // Personal notification channel — receives events for ALL rooms, not just the active one
            notifSubRef.current = client.subscribe(
                `/topic/users/${userId}/notifications`,
                (msg) => {
                    const payload = JSON.parse(msg.body);
                    const roomId = payload.roomId;
                    // Only count as unread if this room isn't currently open
                    if (String(roomId) !== String(activeRoomIdRef.current)) {
                        setUnreadCounts((prev) => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }));
                    }
                }
            );

            resubscribe(activeRoomIdRef.current);
        };
        client.onDisconnect = () => {
            setWsConnected(false);
            client._scheduleReconnect();
        };
        client.onStompError = () => {
            setWsConnected(false);
            client._scheduleReconnect();
            showToast("err", "Real-time connection lost. Messages may be delayed.");
        };

        client.activate();
        clientRef.current = client;
        resubscribeRef.current = resubscribe;

        return () => {
            subscriptionRef.current?.unsubscribe();
            typingSubRef.current?.unsubscribe();
            notifSubRef.current?.unsubscribe();
            Object.values(presenceSubsRef.current).forEach((s) => s.unsubscribe());
            presenceSubsRef.current = {};
            subscriptionRef.current = null;
            typingSubRef.current = null;
            notifSubRef.current = null;
            resubscribeRef.current = null;
            client.deactivate();
            clientRef.current = null;
        };
    }, [token, userId, username]);

    // ── Subscribe to presence for ALL rooms ──────────────────
    useEffect(() => {
        const client = clientRef.current;
        if (!client?.connected || rooms.length === 0) return;

        const currentIds = new Set(rooms.map((r) => String(r.id)));

        // Unsubscribe rooms no longer in list
        Object.keys(presenceSubsRef.current).forEach((id) => {
            if (!currentIds.has(id)) {
                presenceSubsRef.current[id].unsubscribe();
                delete presenceSubsRef.current[id];
            }
        });

        // Subscribe to new rooms
        rooms.forEach((room) => {
            const key = String(room.id);
            if (!presenceSubsRef.current[key]) {
                presenceSubsRef.current[key] = client.subscribe(
                    `/topic/rooms/${room.id}/presence`,
                    (msg) => {
                        const { userId, online } = JSON.parse(msg.body);
                        setOnlineUsers((prev) => ({ ...prev, [String(userId)]: online }));
                    }
                );
            }
        });

        // Refresh presence state now that subscriptions are active.
        // The backend broadcasts on connect but React hasn't subscribed yet at that
        // moment, so we re-fetch via HTTP to get the current snapshot.
        getPresence().then(({ data: onlineIds }) => {
            const map = {};
            onlineIds.forEach((id) => { map[String(id)] = true; });
            setOnlineUsers(map);
        }).catch(() => {});
    }, [rooms, wsConnected]);

    // ── Swap subscription on room change ────────────────────
    useEffect(() => {
        activeRoomIdRef.current = activeRoomId;
        resubscribeRef.current?.(activeRoomId);
        setEditingMessageId(null);
        setEditContent("");
        if (activeRoomId) {
            setUnreadCounts((prev) => {
                if (!prev[activeRoomId]) return prev;
                const next = { ...prev };
                delete next[activeRoomId];
                return next;
            });
            markRoomRead(activeRoomId).catch(() => {});
        }
    }, [activeRoomId]);

    // ── Actions ──────────────────────────────────────────────
    async function handleCreateRoom() {
        const name = roomName.trim();
        if (!name) { showToast("err", "Enter a room name first."); return; }
        try {
            await createRoom({ name, isPrivate });
            setRoomName(""); setIsPrivate(false); setShowNewRoom(false);
            showToast("ok", `Room "${name}" created.`);
            loadRooms();
        } catch (err) {
            showToast("err", err?.response?.data?.message || err?.response?.data?.error || "Failed to create room.");
        }
    }

    async function handleJoinPublicRoom(roomId, name) {
        try {
            await joinRoom(roomId);
            showToast("ok", `Joined "${name}".`);
            setActiveRoomId(roomId);
            setActiveTab("chats");
            loadRooms();
            loadPublicRooms(0, publicQuery);
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to join room.");
        }
    }

    async function handleLeaveRoom() {
        if (!activeRoomId) return;
        try {
            await leaveRoom(activeRoomId);
            showToast("ok", `Left "${activeRoom?.name}".`);
            setActiveRoomId(null);
            setRooms((prev) => prev.filter((r) => r.id !== activeRoomId));
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to leave room.");
        }
    }

    async function handleDeleteRoom() {
        if (!activeRoomId) return;
        try {
            await deleteRoom(activeRoomId);
            showToast("ok", `Deleted "${activeRoom?.name}".`);
            setActiveRoomId(null);
            setRooms((prev) => prev.filter((r) => r.id !== activeRoomId));
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to delete room.");
        }
    }

    async function handleDeleteMessage(messageId) {
        try {
            await deleteMessage(activeRoomId, messageId);
            setMessages((prev) => prev.map((m) =>
                m.id === messageId ? { ...m, deleted: true, content: null } : m
            ));
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to delete message.");
        }
    }

    async function handleEditMessage(messageId, newContent) {
        if (!newContent.trim()) return;
        try {
            await editMessage(activeRoomId, messageId, { content: newContent.trim() });
            setMessages((prev) => prev.map((m) =>
                m.id === messageId ? { ...m, content: newContent.trim(), editedAt: new Date().toISOString() } : m
            ));
            setEditingMessageId(null);
            setEditContent("");
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to edit message.");
        }
    }

    async function handleStartDm(targetUserId) {
        try {
            const { data: room } = await startDm(targetUserId);
            setShowDmSearch(false);
            setDmQuery("");
            setDmResults([]);
            setActiveTab("chats");
            await loadRooms();
            setActiveRoomId(room.id);
        } catch (err) {
            showToast("err", err?.response?.data?.message || "Failed to open conversation.");
        }
    }

    async function handleDmQueryChange(e) {
        const q = e.target.value;
        setDmQuery(q);
        if (!q.trim()) { setDmResults([]); return; }
        setDmLoading(true);
        try {
            const { data } = await searchUsers(q.trim());
            setDmResults(data);
        } catch {
            setDmResults([]);
        } finally {
            setDmLoading(false);
        }
    }

    function handleSend(event) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !activeRoomId) return;

        const client = clientRef.current;
        if (client && client.connected) {
            client.publish({ destination: `/app/rooms/${activeRoomId}/send`, body: JSON.stringify({ content: text }) });
            setDraft("");
            return;
        }

        sendMessage(activeRoomId, { content: text })
            .then(({ data }) => { setMessages((prev) => [...prev, mapMessage(data, userId, username)]); setDraft(""); })
            .catch(() => showToast("err", "Message failed to send."));
    }

    function handleDraftChange(e) {
        setDraft(e.target.value);
        const now = Date.now();
        if (now - lastTypeSentRef.current > 2000 && clientRef.current?.connected && activeRoomId) {
            clientRef.current.publish({ destination: `/app/rooms/${activeRoomId}/typing`, body: "{}" });
            lastTypeSentRef.current = now;
        }
    }

    function handleEmojiSelect(emoji) {
        const input = composerInputRef.current;
        const native = emoji.native;
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newDraft = draft.slice(0, start) + native + draft.slice(end);
            setDraft(newDraft);
            // restore cursor after emoji
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(start + native.length, start + native.length);
            });
        } else {
            setDraft((d) => d + native);
        }
        setShowEmojiPicker(false);
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !activeRoomId) return;
        if (!file.type.startsWith("image/")) { showToast("err", "Images only."); return; }
        if (file.size > 10 * 1024 * 1024) { showToast("err", "Max 10MB."); return; }

        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const { data } = await uploadImage(activeRoomId, formData);
            if (!clientRef.current?.connected) {
                setMessages((prev) => [...prev, mapMessage(data, userId, username)]);
            }
        } catch (err) {
            showToast("err", err?.response?.data?.error || "Upload failed.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    // ── Derived ───────────────────────────────────────────────
    const isOwner = activeRoom && String(activeRoom.creatorId) === String(userId);
    const isDm = activeRoom?.type === "direct";
    const typerList = Object.values(typers);
    const dmRooms = rooms.filter((r) => r.type === "direct");
    const groupRooms = rooms.filter((r) => r.type !== "direct");

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="app-shell">
            <Sidebar />

            {/* ── Left: chat list ── */}
            <div className="list-panel">
                <div className="list-panel-header">
                    <h2 className="list-panel-title">Chats</h2>
                    <div className="list-panel-actions">
                        <button className="icon-btn" title="New direct message" onClick={() => { setShowDmSearch((s) => !s); setShowNewRoom(false); }}>
                            <IconCompose />
                        </button>
                        <button className="icon-btn" onClick={() => { setShowNewRoom((s) => !s); setShowDmSearch(false); }} title="New group">
                            <IconPlus />
                        </button>
                    </div>
                </div>

                {/* DM user search popover */}
                {showDmSearch && (
                    <div className="dm-search-popover" ref={dmSearchRef}>
                        <input
                            className="lc-input"
                            placeholder="Search users..."
                            value={dmQuery}
                            onChange={handleDmQueryChange}
                            autoFocus
                        />
                        {dmLoading && <p className="dm-search-hint">Searching...</p>}
                        {!dmLoading && dmQuery && dmResults.length === 0 && (
                            <p className="dm-search-hint">No users found.</p>
                        )}
                        {dmResults.map((u) => (
                            <button key={u.id} className="dm-search-result" onClick={() => handleStartDm(u.id)}>
                                <div className="dm-search-avatar">{u.username.charAt(0).toUpperCase()}</div>
                                <span>{u.username}</span>
                            </button>
                        ))}
                    </div>
                )}

                {showNewRoom && (
                    <div className="new-room-form">
                        <input
                            className="lc-input"
                            placeholder="Room name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                            autoFocus
                        />
                        <div className="new-room-row">
                            <label className="lc-toggle">
                                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                                Private
                            </label>
                            <div className="new-room-actions">
                                <button className="text-btn" onClick={() => { setShowNewRoom(false); setRoomName(""); setIsPrivate(false); }}>Cancel</button>
                                <button className="lc-btn-primary" onClick={handleCreateRoom}>Create</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="list-tabs">
                    <button className={`list-tab ${activeTab === "chats" ? "list-tab--active" : ""}`} onClick={() => setActiveTab("chats")}>Your Chats</button>
                    <button className={`list-tab ${activeTab === "discover" ? "list-tab--active" : ""}`} onClick={() => { setActiveTab("discover"); loadPublicRooms(0, publicQuery); }}>Discover</button>
                </div>

                {activeTab === "discover" && (
                    <div className="list-search">
                        <input
                            className="lc-input"
                            placeholder="Search public rooms..."
                            value={publicQuery}
                            onChange={(e) => setPublicQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && loadPublicRooms(0, publicQuery)}
                        />
                    </div>
                )}

                <div className="list-body">
                    {activeTab === "chats" && (
                        <>
                            {roomsState.loading && <p className="list-empty">Loading...</p>}
                            {roomsState.error && <p className="list-empty list-empty--err">{roomsState.error}</p>}
                            {!roomsState.loading && !roomsState.error && rooms.length === 0 && (
                                <p className="list-empty">No chats yet — start a conversation!</p>
                            )}

                            {dmRooms.length > 0 && (
                                <>
                                    <div className="list-section-label">Direct Messages</div>
                                    {dmRooms.map((room) => {
                                        const hasUnread = unreadCounts[room.id] > 0;
                                        const otherOnline = room.otherUserId && onlineUsers[String(room.otherUserId)];
                                        return (
                                            <button key={room.id} className={`room-item ${room.id === activeRoomId ? "room-item--active" : ""}`} onClick={() => setActiveRoomId(room.id)}>
                                                <div className="room-item-avatar-wrap">
                                                    <div className="room-item-avatar room-item-avatar--dm">{getRoomInitial(room)}</div>
                                                    {hasUnread
                                                        ? <span className="unread-dot" />
                                                        : <span className={`presence-dot ${otherOnline ? "presence-dot--on" : "presence-dot--off"}`} />
                                                    }
                                                </div>
                                                <div className="room-item-info">
                                                    <span className={`room-item-name ${hasUnread ? "room-item-name--unread" : ""}`}>{getRoomDisplayName(room)}</span>
                                                    <span className="room-item-meta">Direct message</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}

                            {groupRooms.length > 0 && (
                                <>
                                    <div className="list-section-label">Groups</div>
                                    {groupRooms.map((room) => {
                                        const hasUnread = unreadCounts[room.id] > 0;
                                        return (
                                            <button key={room.id} className={`room-item ${room.id === activeRoomId ? "room-item--active" : ""}`} onClick={() => setActiveRoomId(room.id)}>
                                                <div className="room-item-avatar-wrap">
                                                    <div className="room-item-avatar">{getRoomInitial(room)}</div>
                                                    {hasUnread && <span className="unread-dot" />}
                                                </div>
                                                <div className="room-item-info">
                                                    <span className={`room-item-name ${hasUnread ? "room-item-name--unread" : ""}`}>{getRoomDisplayName(room)}</span>
                                                    <span className="room-item-meta">{room["private"] ? "Private" : "Public"}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}

                    {activeTab === "discover" && (
                        <>
                            {publicState.loading && <p className="list-empty">Searching...</p>}
                            {publicState.error && <p className="list-empty list-empty--err">{publicState.error}</p>}
                            {!publicState.loading && !publicState.error && publicRooms.length === 0 && <p className="list-empty">No public rooms found.</p>}
                            {publicRooms.map((room) => (
                                <button key={room.id} className="room-item" onClick={() => handleJoinPublicRoom(room.id, room.name)}>
                                    <div className="room-item-avatar">{room.name.charAt(0).toUpperCase()}</div>
                                    <div className="room-item-info">
                                        <span className="room-item-name">{room.name}</span>
                                        <span className="room-item-meta">Public room</span>
                                    </div>
                                    <span className="room-item-join">Join</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* ── Center: chat ── */}
            <div className="chat-main">
                {!activeRoomId ? (
                    <div className="chat-empty-state">
                        <div className="chat-empty-icon"><IconChat /></div>
                        <p>Select a conversation to start chatting</p>
                    </div>
                ) : (
                    <>
                        <div className="chat-header">
                            {activeRoom ? (
                                <>
                                    <div className={`chat-header-avatar ${isDm ? "chat-header-avatar--dm" : ""}`}>
                                        {getRoomInitial(activeRoom)}
                                    </div>
                                    <div className="chat-header-info">
                                        <span className="chat-header-name">{getRoomDisplayName(activeRoom)}</span>
                                        <span className="chat-header-meta">
                                            {isDm ? "Direct message" : (activeRoom["private"] ? "Private group" : "Public group")}
                                        </span>
                                    </div>
                                    <div className={`ws-dot ${wsConnected ? "ws-dot--on" : "ws-dot--off"}`} title={wsConnected ? "Connected" : "Connecting..."} />
                                </>
                            ) : (
                                <div className="chat-header-info"><span className="chat-header-name">Loading...</span></div>
                            )}
                        </div>

                        <div className="chat-stream">
                            {messageState.loading && <p className="stream-empty">Loading messages...</p>}
                            {!messageState.loading && messageState.error && <p className="stream-empty stream-empty--err">{messageState.error}</p>}
                            {!messageState.loading && !messageState.error && messages.length === 0 && <p className="stream-empty">No messages yet — say hello!</p>}
                            {messages.map((msg) => (
                                <div key={msg.id} className={`msg-row ${msg.isMe ? "msg-row--me" : "msg-row--them"}`}>
                                    {!msg.isMe && <div className="msg-avatar">{msg.author.charAt(0).toUpperCase()}</div>}
                                    <div className="msg-content">
                                        {!msg.isMe && <div className="msg-author">{msg.author}</div>}
                                        {editingMessageId === msg.id ? (
                                            <div className="msg-edit-wrap">
                                                <input
                                                    className="msg-edit-input"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleEditMessage(msg.id, editContent);
                                                        if (e.key === "Escape") { setEditingMessageId(null); setEditContent(""); }
                                                    }}
                                                    autoFocus
                                                />
                                                <span className="msg-edit-hint">Enter to save · Esc to cancel</span>
                                            </div>
                                        ) : (
                                            <div
                                                className={`msg-bubble ${msg.deleted ? "msg-bubble--deleted" : ""} ${!msg.deleted && msg.messageType !== "image" && isEmojiOnly(msg.content) ? "msg-bubble--emoji-only" : ""}`}
                                                onDoubleClick={() => {
                                                    if (msg.isMe && !msg.deleted && msg.messageType !== "image") {
                                                        setEditingMessageId(msg.id);
                                                        setEditContent(msg.content);
                                                    }
                                                }}
                                            >
                                                {msg.deleted ? (
                                                    <p>This message was deleted</p>
                                                ) : msg.messageType === "image" ? (
                                                    <img
                                                        className="msg-image"
                                                        src={`${API_BASE}${msg.content}`}
                                                        alt="Shared image"
                                                        onError={(e) => { e.target.style.display = "none"; }}
                                                    />
                                                ) : (
                                                    <p>{msg.content}</p>
                                                )}
                                                {msg.editedAt && !msg.deleted && <span className="msg-edited">(edited)</span>}
                                            </div>
                                        )}
                                        <div className="msg-time-row">
                                            <span className="msg-time">{msg.time}</span>
                                            {msg.isMe && !msg.deleted && editingMessageId !== msg.id && (
                                                <button className="msg-delete" onClick={() => handleDeleteMessage(msg.id)} title="Delete message">
                                                    <IconTrash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {typerList.length > 0 && (
                                <div className="typing-indicator">
                                    <span className="typing-dots"><span /><span /><span /></span>
                                    <span className="typing-text">
                                        {typerList.join(", ")} {typerList.length === 1 ? "is" : "are"} typing...
                                    </span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="composer-wrap">
                            {showEmojiPicker && (
                                <div className="emoji-picker-pop" ref={emojiPickerRef}>
                                    <Picker
                                        data={emojiData}
                                        onEmojiSelect={handleEmojiSelect}
                                        theme={document.documentElement.dataset.theme === "dark" ? "dark" : "light"}
                                        set="twitter"
                                        previewPosition="none"
                                        skinTonePosition="none"
                                        maxFrequentRows={2}
                                    />
                                </div>
                            )}
                            <form className="chat-composer" onSubmit={handleSend}>
                                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload} />
                                <button
                                    type="button"
                                    className="composer-image-btn"
                                    disabled={!activeRoomId || uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Send image"
                                >
                                    <IconImage />
                                </button>
                                <input
                                    ref={composerInputRef}
                                    className="composer-input"
                                    placeholder={uploading ? "Uploading..." : "Type a message..."}
                                    value={draft}
                                    onChange={handleDraftChange}
                                    disabled={!activeRoomId || uploading}
                                />
                                <button
                                    type="button"
                                    className="composer-emoji-btn"
                                    disabled={!activeRoomId || uploading}
                                    onClick={() => setShowEmojiPicker((v) => !v)}
                                    title="Insert emoji"
                                >
                                    😊
                                </button>
                                <button className="composer-send" type="submit" disabled={!activeRoomId || !draft.trim() || uploading}>Send</button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* ── Right: info panel ── */}
            <div className="info-panel">
                {activeRoom ? (
                    <>
                        <div className={`info-avatar ${isDm ? "info-avatar--dm" : ""}`}>
                            {getRoomInitial(activeRoom)}
                        </div>
                        <h3 className="info-name">{getRoomDisplayName(activeRoom)}</h3>
                        <span className="info-badge">{isDm ? "Direct Message" : (activeRoom["private"] ? "Private" : "Public")}</span>

                        <div className="info-divider" />

                        {isDm ? (
                            <div className="info-section">
                                <h4 className="info-section-title">Conversation</h4>
                                <p className="info-detail">Private 1-on-1 chat</p>
                                {activeRoom.createdAt && (
                                    <p className="info-detail">Started {new Date(activeRoom.createdAt).toLocaleDateString()}</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="info-section">
                                    <h4 className="info-section-title">Members · {roomMembers.length}</h4>
                                    {roomMembers.map((m) => (
                                        <div key={m.userId} className="info-member">
                                            <div className="info-member-avatar-wrap">
                                                <div className="info-member-avatar">{m.username.charAt(0).toUpperCase()}</div>
                                                <span className={`presence-dot ${onlineUsers[String(m.userId)] ? "presence-dot--on" : "presence-dot--off"}`} />
                                            </div>
                                            <span className="info-member-name">{m.username}{String(m.userId) === String(userId) ? " (you)" : ""}</span>
                                            {m.role !== "member" && <span className="info-role-badge">{m.role}</span>}
                                        </div>
                                    ))}
                                </div>

                                <div className="info-divider" />

                                <div className="info-section">
                                    <h4 className="info-section-title">Details</h4>
                                    <p className="info-detail">Room #{activeRoom.id}</p>
                                    {activeRoom.createdAt && (
                                        <p className="info-detail">Created {new Date(activeRoom.createdAt).toLocaleDateString()}</p>
                                    )}
                                </div>

                                <div className="info-divider" />

                                <div className="info-actions">
                                    {isOwner ? (
                                        <button className="info-action-btn info-action-btn--danger" onClick={handleDeleteRoom}>
                                            Delete room
                                        </button>
                                    ) : (
                                        <button className="info-action-btn" onClick={handleLeaveRoom}>
                                            Leave room
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <p className="info-empty">Select a chat to see details</p>
                )}
            </div>

            {toast.text && <div className={`toast toast--${toast.type}`}>{toast.text}</div>}
        </div>
    );
}

function parseJwt(token) {
    try {
        const payload = token.split(".")[1];
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(new TextDecoder().decode(Uint8Array.from(json, c => c.charCodeAt(0))));
    } catch { return null; }
}

function mapMessage(message, userId, username) {
    const isMe = userId && String(message.senderId) === String(userId);
    const author = isMe ? username : message.senderUsername || `User ${message.senderId}`;
    const timestamp = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
        id: message.id,
        author,
        content: message.content,
        time: timestamp,
        isMe,
        deleted: message.deleted || false,
        editedAt: message.editedAt || null,
        messageType: message.messageType || "text",
    };
}
