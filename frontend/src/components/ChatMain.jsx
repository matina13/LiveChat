import { useState, useEffect, useRef } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data/sets/15/twitter.json";
import { API_BASE } from "../api/client";
import { IconChat, IconTrash, IconImage, IconReply } from "./icons";
import { getRoomDisplayName, getRoomInitial } from "../utils/chatUtils";
import Avatar from "./Avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u;

function isEmojiOnly(text) {
    return text.trim().length > 0 && EMOJI_ONLY_RE.test(text.trim());
}

const URL_RE = /https?:\/\/[^\s]+/g;

function renderWithLinks(text) {
    const parts = text.split(URL_RE);
    const matches = [...text.matchAll(URL_RE)];
    return parts.map((part, i) => (
        <span key={i}>
            {part}
            {matches[i] && (
                <a href={matches[i][0]} target="_blank" rel="noopener noreferrer">
                    {matches[i][0]}
                </a>
            )}
        </span>
    ));
}

function calcPickerPos(clientX, clientY) {
    const W = 352, H = 450, PAD = 8;
    const left = Math.max(PAD, Math.min(clientX - W / 2, window.innerWidth - W - PAD));
    const top = clientY - H - PAD > 0 ? clientY - H - PAD : clientY + PAD;
    return { top, left };
}

export default function ChatMain({
    activeRoom, activeRoomId, isDm, wsConnected, hasRooms,
    messages, messageState,
    typerList,
    loadingMore, hasMoreMessages,
    chatStreamRef, messagesEndRef,
    loadMoreMessages,
    handleReaction,
    handleDeleteMessage,
    handleEditMessage,
    editingMessageId, setEditingMessageId,
    editContent, setEditContent,
    replyingTo, setReplyingTo,
    draft, setDraft, handleDraftChange, handleSend,
    uploading, fileInputRef, handleImageUpload,
    onMobileBack, onMobileInfo,
}) {
    // Internal state for overlays and UI
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);
    const [reactionPickerFor, setReactionPickerFor] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const reactionPickerRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const composerInputRef = useRef(null);

    // Reset overlays on room change
    useEffect(() => {
        setHighlightedMsgId(null);
        setReactionPickerFor(null);
        setLightboxSrc(null);
        setShowEmojiPicker(false);
    }, [activeRoomId]);

    // Click-outside: emoji picker
    useEffect(() => {
        if (!showEmojiPicker) return;
        function handler(e) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmojiPicker]);

    // Click-outside: reaction picker
    useEffect(() => {
        if (!reactionPickerFor) return;
        function handler(e) {
            if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target)) setReactionPickerFor(null);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [reactionPickerFor]);

    // Escape: lightbox
    useEffect(() => {
        if (!lightboxSrc) return;
        function handler(e) { if (e.key === "Escape") setLightboxSrc(null); }
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [lightboxSrc]);

    function handleJumpToMessage(msgId) {
        const el = document.getElementById(`msg-${msgId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedMsgId(msgId);
        setTimeout(() => setHighlightedMsgId(null), 1500);
    }

    function handleEmojiSelect(emoji) {
        const input = composerInputRef.current;
        const native = emoji.native;
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            setDraft(draft.slice(0, start) + native + draft.slice(end));
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(start + native.length, start + native.length);
            });
        } else {
            setDraft((d) => d + native);
        }
        setShowEmojiPicker(false);
    }

    if (!activeRoomId) {
        return (
            <div className="chat-main">
                <div className="chat-empty-state">
                    <div className="chat-empty-icon"><IconChat /></div>
                    {hasRooms ? (
                        <p>Select a conversation to start chatting</p>
                    ) : (
                        <>
                            <p className="chat-empty-title">Welcome to LiveChat</p>
                            <p className="chat-empty-sub">Join a public room from the Discover tab or start a direct message to begin.</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="chat-main">
            {/* Header */}
            <div className="chat-header">
                <button className="mobile-back-btn" onClick={onMobileBack} aria-label="Back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                {activeRoom ? (
                    <>
                        <Avatar
                            className={`chat-header-avatar ${isDm ? "chat-header-avatar--dm" : ""}`}
                            username={getRoomDisplayName(activeRoom)}
                            avatarUrl={isDm ? activeRoom.otherUserAvatarUrl : null}
                        />
                        <div className="chat-header-info">
                            <span className="chat-header-name">{getRoomDisplayName(activeRoom)}</span>
                            <span className="chat-header-meta">
                                {isDm ? "Direct message" : (activeRoom["private"] ? "Private group" : "Public group")}
                            </span>
                        </div>
                        <div className={`ws-dot ${wsConnected ? "ws-dot--on" : "ws-dot--off"}`} title={wsConnected ? "Connected" : "Connecting..."} />
                        <button className="mobile-info-btn" onClick={onMobileInfo} aria-label="Room info">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
                        </button>
                    </>
                ) : (
                    <div className="chat-header-info"><span className="chat-header-name">Loading...</span></div>
                )}
            </div>

            {/* Message stream */}
            <div
                className="chat-stream"
                ref={chatStreamRef}
                onScroll={() => {
                    const s = chatStreamRef.current;
                    if (s && s.scrollTop < 100) loadMoreMessages();
                }}
            >
                {loadingMore && <p className="stream-load-indicator">Loading older messages...</p>}
                {!loadingMore && !hasMoreMessages && messages.length > 0 && !messageState.loading && (
                    <p className="stream-beginning">Beginning of conversation</p>
                )}
                {messageState.loading && <p className="stream-empty">Loading messages...</p>}
                {!messageState.loading && messageState.error && <p className="stream-empty stream-empty--err">{messageState.error}</p>}
                {!messageState.loading && !messageState.error && messages.length === 0 && <p className="stream-empty">No messages yet — say hello!</p>}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        className={`msg-row ${msg.isMe ? "msg-row--me" : "msg-row--them"}${highlightedMsgId === msg.id ? " msg-row--highlight" : ""}`}
                    >
                        {!msg.isMe && <Avatar className="msg-avatar" username={msg.author} avatarUrl={msg.senderAvatarUrl} />}
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
                                <div className="msg-bubble-wrap">
                                    {!msg.deleted && (
                                        <div className="msg-reaction-bar">
                                            {QUICK_EMOJIS.map((e) => (
                                                <button key={e} className="reaction-quick-btn" onClick={() => handleReaction(msg.id, e)}>{e}</button>
                                            ))}
                                            <button
                                                className="reaction-quick-btn reaction-quick-btn--more"
                                                onClick={(e) => { e.stopPropagation(); setReactionPickerFor({ msgId: msg.id, ...calcPickerPos(e.clientX, e.clientY) }); }}
                                            >+</button>
                                        </div>
                                    )}
                                    <div
                                        className={`msg-bubble ${msg.deleted ? "msg-bubble--deleted" : ""} ${!msg.deleted && msg.messageType !== "image" && isEmojiOnly(msg.content) ? "msg-bubble--emoji-only" : ""}`}
                                        onDoubleClick={() => {
                                            if (msg.isMe && !msg.deleted && msg.messageType !== "image") {
                                                setEditingMessageId(msg.id);
                                                setEditContent(msg.content);
                                            }
                                        }}
                                    >
                                        {msg.replyToId && (
                                            <div className="reply-quote" onClick={() => handleJumpToMessage(msg.replyToId)}>
                                                <span className="reply-quote-author">{msg.replyToSenderUsername}</span>
                                                <span className="reply-quote-content">
                                                    {msg.replyToContent ?? "Message deleted"}
                                                </span>
                                            </div>
                                        )}
                                        {msg.deleted ? (
                                            <p>This message was deleted</p>
                                        ) : msg.messageType === "image" ? (
                                            <img
                                                className="msg-image"
                                                src={`${API_BASE}${msg.content}`}
                                                alt="Shared image"
                                                onClick={() => setLightboxSrc(`${API_BASE}${msg.content}`)}
                                                onError={(e) => { e.target.style.display = "none"; }}
                                            />
                                        ) : (
                                            <p>{renderWithLinks(msg.content)}</p>
                                        )}
                                        {msg.editedAt && !msg.deleted && <span className="msg-edited">(edited)</span>}
                                    </div>
                                </div>
                            )}

                            {Object.keys(msg.reactions || {}).length > 0 && (
                                <div className="msg-reactions">
                                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                                        <button
                                            key={emoji}
                                            className={`reaction-pill ${(msg.myReactions || []).includes(emoji) ? "reaction-pill--mine" : ""}`}
                                            onClick={() => handleReaction(msg.id, emoji)}
                                        >
                                            {emoji} <span>{count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="msg-time-row">
                                <span className="msg-time">{msg.time}</span>
                                {!msg.deleted && editingMessageId !== msg.id && (
                                    <button
                                        className="msg-reply-btn"
                                        onClick={() => {
                                            setReplyingTo({ id: msg.id, author: msg.author, content: msg.messageType === "image" ? "📷 Image" : msg.content, messageType: msg.messageType });
                                            composerInputRef.current?.focus();
                                        }}
                                        title="Reply"
                                    >
                                        <IconReply />
                                    </button>
                                )}
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

            {/* Composer */}
            <div className="composer-wrap">
                {replyingTo && (
                    <div className="reply-bar">
                        <div className="reply-bar-body">
                            <span className="reply-bar-author">Replying to {replyingTo.author}</span>
                            <span className="reply-bar-preview">{replyingTo.content}</span>
                        </div>
                        <button className="reply-bar-cancel" onClick={() => setReplyingTo(null)} title="Cancel reply">✕</button>
                    </div>
                )}
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
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                    <button type="button" className="composer-image-btn" disabled={!activeRoomId || uploading} onClick={() => fileInputRef.current?.click()} title="Send image">
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
                    <button type="button" className="composer-emoji-btn" disabled={!activeRoomId || uploading} onClick={() => setShowEmojiPicker((v) => !v)} title="Insert emoji">
                        😊
                    </button>
                    <button className="composer-send" type="submit" disabled={!activeRoomId || !draft.trim() || uploading}>Send</button>
                </form>
            </div>

            {/* Reaction picker overlay */}
            {reactionPickerFor && (
                <div ref={reactionPickerRef} className="reaction-picker-pop" style={{ top: reactionPickerFor.top, left: reactionPickerFor.left }}>
                    <Picker
                        data={emojiData}
                        onEmojiSelect={(emoji) => { handleReaction(reactionPickerFor.msgId, emoji.native); setReactionPickerFor(null); }}
                        theme={document.documentElement.dataset.theme === "dark" ? "dark" : "light"}
                        set="twitter"
                        previewPosition="none"
                        skinTonePosition="none"
                        maxFrequentRows={2}
                    />
                </div>
            )}

            {/* Lightbox */}
            {lightboxSrc && (
                <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
                    <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
                    <img className="lightbox-img" src={lightboxSrc} alt="Full size" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
