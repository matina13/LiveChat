import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ChatList from "../components/ChatList";
import ChatMain from "../components/ChatMain";
import RoomInfo from "../components/RoomInfo";
import { createRoom, joinRoom, listRooms, searchPublicRooms, getRoom, leaveRoom, deleteRoom, getRoomMembers, startDm, getPresence } from "../api/roomsApi";
import { listMessages, sendMessage, editMessage, deleteMessage, markRoomRead, uploadImage, toggleReaction } from "../api/messagesApi";
import { searchUsers } from "../api/usersApi";
import { createStompClient } from "../api/wsClient";
import "./RoomsPage.css";

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
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);

    // Pagination / infinite scroll
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const msgPageRef = useRef(0);
    const chatStreamRef = useRef(null);
    const scrollRestoreRef = useRef(null);

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
    const presenceSubsRef = useRef({});
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

    // ── Active room + messages + members ────────────────────
    useEffect(() => {
        if (!activeRoomId) {
            setActiveRoom(null);
            setMessages([]);
            setRoomMembers([]);
            setHasMoreMessages(false);
            msgPageRef.current = 0;
            return;
        }

        let active = true;
        setHasMoreMessages(false);
        msgPageRef.current = 0;
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
                setHasMoreMessages(50 < msgRes.data.total);
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

    // ── Auto-scroll / scroll restore ─────────────────────────
    useEffect(() => {
        const stream = chatStreamRef.current;
        if (scrollRestoreRef.current !== null) {
            if (stream) stream.scrollTop = stream.scrollHeight - scrollRestoreRef.current;
            scrollRestoreRef.current = null;
            return;
        }
        if (!stream || stream.scrollHeight - stream.scrollTop - stream.clientHeight < 120) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
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
                            m.id === payload.id ? { ...m, content: payload.content, editedAt: payload.editedAt } : m
                        ));
                    } else if (payload.type === "delete") {
                        setMessages((prev) => prev.map((m) =>
                            m.id === payload.id ? { ...m, deleted: true, content: null } : m
                        ));
                    } else if (payload.type === "reaction") {
                        setMessages((prev) => prev.map((m) =>
                            m.id === payload.messageId ? { ...m, reactions: payload.reactions || {} } : m
                        ));
                    } else {
                        setMessages((prev) => [...prev, mapMessage(payload, userId, username)]);
                        const senderId = String(payload.senderId);
                        if (typerTimersRef.current[senderId]) {
                            clearTimeout(typerTimersRef.current[senderId]);
                            delete typerTimersRef.current[senderId];
                        }
                        setTypers((prev) => { const next = { ...prev }; delete next[senderId]; return next; });
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
            notifSubRef.current = client.subscribe(
                `/topic/users/${userId}/notifications`,
                (msg) => {
                    const payload = JSON.parse(msg.body);
                    const roomId = payload.roomId;
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
        Object.keys(presenceSubsRef.current).forEach((id) => {
            if (!currentIds.has(id)) {
                presenceSubsRef.current[id].unsubscribe();
                delete presenceSubsRef.current[id];
            }
        });
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
        setReplyingTo(null);
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

        const payload = { content: text, ...(replyingTo ? { replyToId: replyingTo.id } : {}) };

        const client = clientRef.current;
        if (client && client.connected) {
            client.publish({ destination: `/app/rooms/${activeRoomId}/send`, body: JSON.stringify(payload) });
            setDraft("");
            setReplyingTo(null);
            return;
        }

        sendMessage(activeRoomId, payload)
            .then(({ data }) => { setMessages((prev) => [...prev, mapMessage(data, userId, username)]); setDraft(""); setReplyingTo(null); })
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

    async function handleReaction(messageId, emoji) {
        if (!activeRoomId) return;
        setMessages((prev) => prev.map((m) => {
            if (m.id !== messageId) return m;
            const hasIt = (m.myReactions || []).includes(emoji);
            const newCount = (m.reactions?.[emoji] || 0) + (hasIt ? -1 : 1);
            const newReactions = { ...m.reactions };
            if (newCount <= 0) delete newReactions[emoji];
            else newReactions[emoji] = newCount;
            return {
                ...m,
                reactions: newReactions,
                myReactions: hasIt
                    ? (m.myReactions || []).filter((e) => e !== emoji)
                    : [...(m.myReactions || []), emoji],
            };
        }));
        try {
            await toggleReaction(activeRoomId, messageId, { emoji });
        } catch {
            showToast("err", "Failed to react.");
        }
    }

    async function loadMoreMessages() {
        if (loadingMore || !hasMoreMessages || !activeRoomId) return;
        const stream = chatStreamRef.current;
        if (stream) scrollRestoreRef.current = stream.scrollHeight - stream.scrollTop;
        setLoadingMore(true);
        const nextPage = msgPageRef.current + 1;
        try {
            const { data } = await listMessages(activeRoomId, { page: nextPage, size: 50 });
            const older = data.messages.slice().reverse().map((m) => mapMessage(m, userId, username));
            setMessages((prev) => [...older, ...prev]);
            msgPageRef.current = nextPage;
            setHasMoreMessages((nextPage + 1) * 50 < data.total);
        } catch {
            showToast("err", "Failed to load older messages.");
        } finally {
            setLoadingMore(false);
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

            <ChatList
                rooms={rooms} dmRooms={dmRooms} groupRooms={groupRooms}
                activeRoomId={activeRoomId} setActiveRoomId={setActiveRoomId}
                unreadCounts={unreadCounts} onlineUsers={onlineUsers}
                activeTab={activeTab} setActiveTab={setActiveTab}
                publicQuery={publicQuery} setPublicQuery={setPublicQuery}
                publicRooms={publicRooms} publicState={publicState} loadPublicRooms={loadPublicRooms}
                roomsState={roomsState}
                showDmSearch={showDmSearch} setShowDmSearch={setShowDmSearch}
                dmQuery={dmQuery} dmResults={dmResults} dmLoading={dmLoading}
                handleDmQueryChange={handleDmQueryChange} handleStartDm={handleStartDm} dmSearchRef={dmSearchRef}
                showNewRoom={showNewRoom} setShowNewRoom={setShowNewRoom}
                roomName={roomName} setRoomName={setRoomName}
                isPrivate={isPrivate} setIsPrivate={setIsPrivate}
                handleCreateRoom={handleCreateRoom}
                handleJoinPublicRoom={handleJoinPublicRoom}
            />

            <ChatMain
                activeRoom={activeRoom} activeRoomId={activeRoomId} isDm={isDm} wsConnected={wsConnected} hasRooms={rooms.length > 0}
                messages={messages} messageState={messageState}
                typerList={typerList}
                loadingMore={loadingMore} hasMoreMessages={hasMoreMessages}
                chatStreamRef={chatStreamRef} messagesEndRef={messagesEndRef}
                loadMoreMessages={loadMoreMessages}
                handleReaction={handleReaction}
                handleDeleteMessage={handleDeleteMessage}
                handleEditMessage={handleEditMessage}
                editingMessageId={editingMessageId} setEditingMessageId={setEditingMessageId}
                editContent={editContent} setEditContent={setEditContent}
                replyingTo={replyingTo} setReplyingTo={setReplyingTo}
                draft={draft} setDraft={setDraft} handleDraftChange={handleDraftChange} handleSend={handleSend}
                uploading={uploading} fileInputRef={fileInputRef} handleImageUpload={handleImageUpload}
            />

            <RoomInfo
                activeRoom={activeRoom} isDm={isDm}
                roomMembers={roomMembers} onlineUsers={onlineUsers}
                userId={userId} isOwner={isOwner}
                onLeave={handleLeaveRoom} onDelete={handleDeleteRoom}
            />

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
        reactions: message.reactions || {},
        myReactions: message.myReactions || [],
        replyToId: message.replyToId || null,
        replyToSenderUsername: message.replyToSenderUsername || null,
        replyToContent: message.replyToContent || null,
        senderAvatarUrl: message.senderAvatarUrl || null,
    };
}
