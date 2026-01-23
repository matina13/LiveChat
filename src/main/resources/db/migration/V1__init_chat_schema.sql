-- USERS
CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHAT ROOMS
CREATE TABLE rooms (
                       id BIGSERIAL PRIMARY KEY,
                       name VARCHAR(100) NOT NULL UNIQUE,
                       is_private BOOLEAN NOT NULL DEFAULT FALSE,
                       creator_id BIGINT NOT NULL,
                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       last_message_at TIMESTAMPTZ,

                       CONSTRAINT fk_rooms_creator
                           FOREIGN KEY (creator_id)
                               REFERENCES users(id)
                               ON DELETE CASCADE
);

-- ROOM MEMBERS
CREATE TABLE room_members (
                              id BIGSERIAL PRIMARY KEY,
                              user_id BIGINT NOT NULL,
                              room_id BIGINT NOT NULL,
                              role VARCHAR(20) NOT NULL DEFAULT 'member',
                              joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                              CONSTRAINT fk_room_members_user
                                  FOREIGN KEY (user_id)
                                      REFERENCES users(id)
                                      ON DELETE CASCADE,

                              CONSTRAINT fk_room_members_room
                                  FOREIGN KEY (room_id)
                                      REFERENCES rooms(id)
                                      ON DELETE CASCADE,

                              CONSTRAINT uq_room_members UNIQUE (user_id, room_id),
                              CONSTRAINT chk_room_members_role CHECK (role IN ('member','admin','owner'))
);

-- MESSAGES
CREATE TABLE messages (
                          id BIGSERIAL PRIMARY KEY,
                          room_id BIGINT NOT NULL,
                          sender_id BIGINT NOT NULL,
                          content TEXT NOT NULL,
                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                          CONSTRAINT fk_messages_room
                              FOREIGN KEY (room_id)
                                  REFERENCES rooms(id)
                                  ON DELETE CASCADE,

                          CONSTRAINT fk_messages_sender
                              FOREIGN KEY (sender_id)
                                  REFERENCES users(id)
                                  ON DELETE CASCADE
);

-- INDEXES
CREATE INDEX idx_messages_room_time
    ON messages(room_id, created_at DESC);

CREATE INDEX idx_messages_sender_time
    ON messages(sender_id, created_at DESC);

CREATE INDEX idx_room_members_user
    ON room_members(user_id);

CREATE INDEX idx_room_members_room
    ON room_members(room_id);

CREATE INDEX idx_rooms_last_message
    ON rooms(last_message_at DESC);
