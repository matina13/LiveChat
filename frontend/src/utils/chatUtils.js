export function getRoomDisplayName(room) {
    return room.type === "direct" ? (room.otherUsername || "DM") : room.name;
}

export function getRoomInitial(room) {
    return getRoomDisplayName(room).charAt(0).toUpperCase();
}
