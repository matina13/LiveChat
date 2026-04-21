import { useState } from "react";
import { getRoomDisplayName, getRoomInitial } from "../utils/chatUtils";
import { searchUsers } from "../api/usersApi";
import Avatar from "./Avatar";

export default function RoomInfo({ activeRoom, isDm, roomMembers, onlineUsers, userId, isOwner, onLeave, onDelete, onInvite, onMobileBack }) {
    const [showInvite, setShowInvite] = useState(false);
    const [inviteQuery, setInviteQuery] = useState("");
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);

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
                                    {isOwner && (
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
                                {roomMembers.map((m) => (
                                    <div key={m.userId} className="info-member">
                                        <div className="info-member-avatar-wrap">
                                            <Avatar className="info-member-avatar" username={m.username} avatarUrl={m.avatarUrl} />
                                            <span className={`presence-dot ${onlineUsers[String(m.userId)] ? "presence-dot--on" : "presence-dot--off"}`} />
                                        </div>
                                        <span className="info-member-name">
                                            {m.username}{String(m.userId) === String(userId) ? " (you)" : ""}
                                        </span>
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
