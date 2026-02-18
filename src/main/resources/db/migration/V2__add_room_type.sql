ALTER TABLE rooms ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'group';
ALTER TABLE rooms ADD CONSTRAINT chk_rooms_type CHECK (type IN ('group', 'direct'));
