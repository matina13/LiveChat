import { useState, useEffect, useRef } from "react";
import { getRoomDisplayName, getRoomInitial } from "../utils/chatUtils";
import { searchUsers } from "../api/usersApi";
import Avatar from "./Avatar";

export default function RoomInfo({ activeRoom, isDm, roomMembers, onlineUsers, userId, isOwner, myRole, onLeave, onDelete, onInvite, onChangeRole, onKick, onMobileBack }) {
    const [showInvite, setShowInvite] = useState(false);
    const [inviteQuery, setInviteQuery] = useState("");
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [menuOpenFor, setMenuOpenFor] = useState(null);
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        if (menuOpenFor === null) return;
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenFor(null);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpenFor]);

    // Close menu on room change
    useEffect(() => { setMenuOpenFor(null); }, [activeRoom?.id]);

    async function handleInviteSearch(e) {
        const q = e.target.value;
        setInviteQuery(q);
        if (!q.trim()) { setInviteResults([]); return; }
        setInviteLoading(true);
        try {
            const { data } = await searchUsers(q.trim());
            const memberIds = new Set(roomMembers.map(m => String(m.userId)));
            setInviteResults(data.filter(u => !memberIds.has(String(u.id))));
        } catch {
            setInviteResults([]);
        } finally {
            setInviteLoading(false);
        }
    }

    async function handlePickUser(username) {
        await onInvite(username);
        setShowInvite(false);
        setInviteQuery("");
        setInviteResults([]);
    }
    return (
        <div className="info-panel">
            <button className="mobile-back-btn mobile-back-btn--info" onClick={onMobileBack} aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {activeRoom ? (
                <>
                    <Avatar
                        className={`info-avatar ${isDm ? "info-avatar--dm" : ""}`}
                        username={getRoomDisplayName(activeRoom)}
                        avatarUrl={isDm ? activeRoom.otherUserAvatarUrl : null}
                    />
                    <h3 className="info-name">{getRoomDisplayName(activeRoom)}</h3>
                    <span className="info-badge">{isDm ? "Direct Message" : (activeRoom.isPrivate ? "Private" : "Public")}</span>

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
                                <div className="info-section-header">
                                    <h4 className="info-section-title">Members · {roomMembers.length}</h4>
                                    {(myRole === "owner" || myRole === "admin") && (
                                        <button className="info-invite-btn" onClick={() => { setShowInvite(v => !v); setInviteQuery(""); setInviteResults([]); }} title="Invite member">
                                            + Invite
                                        </button>
                                    )}
                                </div>
                                {showInvite && (
                                    <div className="info-invite-box">
                                        <input
                                            className="info-invite-input"
                                            placeholder="Search username..."
                                            value={inviteQuery}
                                            onChange={handleInviteSearch}
                                            autoFocus
                                        />
                                        {inviteLoading && <p className="info-invite-hint">Searching...</p>}
                                        {!inviteLoading && inviteQuery && inviteResults.length === 0 && (
                                            <p className="info-invite-hint">No users found.</p>
                                        )}
                                        {inviteResults.map(u => (
                                            <button key={u.id} className="info-invite-result" onClick={() => handlePickUser(u.username)}>
                                                <Avatar className="info-invite-avatar" username={u.username} avatarUrl={u.avatarUrl} />
                                                <span>{u.username}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {roomMembers.map((m) => {
                                    const isMe = String(m.userId) === String(userId);
                                    const canManage = !isMe && (
                                        (myRole === "owner" && m.role !== "owner") ||
                                        (myRole === "admin" && m.role === "member")
                                    );
                                    const menuOpen = menuOpenFor === m.userId;
                                    return (
                                        <div key={m.userId} className="info-member">
                                            <div className="info-member-avatar-wrap">
                                                <Avatar className="info-member-avatar" username={m.username} avatarUrl={m.avatarUrl} />
                                                <span className={`presence-dot ${onlineUsers[String(m.userId)] ? "presence-dot--on" : "presence-dot--off"}`} />
                                            </div>
                                            <span className="info-member-name">
                                                {m.username}{isMe ? " (you)" : ""}
                                            </span>
                                            {m.role !== "member" && <span className="info-role-badge">{m.role}</span>}
                                            {canManage && (
                                                <div className="info-member-menu-wrap" ref={menuOpen ? menuRef : undefined}>
                                                    <button
                                                        className="info-member-dots"
                                                        onClick={() => setMenuOpenFor(menuOpen ? null : m.userId)}
                                                        aria-label="Member options"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                                                    </button>
                                                    {menuOpen && (
                                                        <div className="info-member-popover">
                                                            {myRole === "owner" && (
                                                                <button
                                                                    className="info-member-popover-item"
                                                                    onClick={() => { onChangeRole(m.userId, m.role === "admin" ? "member" : "admin"); setMenuOpenFor(null); }}
                                                                >
                                                                    {m.role === "admin" ? "Make member" : "Make admin"}
                                                                </button>
                                                            )}
                                                            <button
                                                                className="info-member-popover-item info-member-popover-item--danger"
                                                                onClick={() => { onKick(m.userId, m.username); setMenuOpenFor(null); }}
                                                            >
                                                                Remove from room
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                                    <button className="info-action-btn info-action-btn--danger" onClick={onDelete}>
                                        Delete room
                                    </button>
                                ) : (
                                    <button className="info-action-btn" onClick={onLeave}>
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
    );
}
