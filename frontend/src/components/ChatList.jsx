import { IconPlus, IconCompose } from "./icons";
import { getRoomDisplayName, getRoomInitial } from "../utils/chatUtils";
import Avatar from "./Avatar";

export default function ChatList({
    rooms, dmRooms, groupRooms,
    activeRoomId, setActiveRoomId,
    unreadCounts, onlineUsers,
    activeTab, setActiveTab,
    publicQuery, setPublicQuery, publicRooms, publicState, loadPublicRooms,
    roomsState,
    showDmSearch, setShowDmSearch, dmQuery, dmResults, dmLoading, handleDmQueryChange, handleStartDm, dmSearchRef,
    showNewRoom, setShowNewRoom, roomName, setRoomName, isPrivate, setIsPrivate, handleCreateRoom,
    handleJoinPublicRoom,
}) {
    return (
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
                            <Avatar className="dm-search-avatar" username={u.username} avatarUrl={u.avatarUrl} />
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
                                                <Avatar className="room-item-avatar room-item-avatar--dm" username={getRoomDisplayName(room)} avatarUrl={room.otherUserAvatarUrl} />
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
    );
}
