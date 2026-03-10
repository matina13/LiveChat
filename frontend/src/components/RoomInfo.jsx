import { getRoomDisplayName, getRoomInitial } from "../utils/chatUtils";

export default function RoomInfo({ activeRoom, isDm, roomMembers, onlineUsers, userId, isOwner, onLeave, onDelete }) {
    return (
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
