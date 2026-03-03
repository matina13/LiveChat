-- Unread tracking: when the user last read each room
ALTER TABLE room_members ADD COLUMN last_read_at TIMESTAMPTZ;

-- Soft delete: null content + timestamp instead of hard delete
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;

-- Message edit
ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ;

-- Indexes for the new columns
CREATE INDEX idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_messages_edited  ON messages(edited_at)  WHERE edited_at  IS NOT NULL;
