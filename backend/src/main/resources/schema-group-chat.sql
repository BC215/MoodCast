CREATE TABLE IF NOT EXISTS chat_room (
    room_id BIGINT NOT NULL AUTO_INCREMENT,
    room_type VARCHAR(20) NOT NULL DEFAULT 'GROUP',
    room_name VARCHAR(100) NOT NULL,
    room_description VARCHAR(255) NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
    PRIMARY KEY (room_id),
    KEY idx_chat_room_created_by (created_by),
    KEY idx_chat_room_deleted_yn (deleted_yn),
    CONSTRAINT fk_chat_room_created_by
        FOREIGN KEY (created_by) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS chat_room_member (
    room_member_id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    hidden_at DATETIME(6) NULL,
    left_at DATETIME(6) NULL,
    last_read_at DATETIME(6) NULL,
    last_read_message_id BIGINT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
    PRIMARY KEY (room_member_id),
    UNIQUE KEY uk_chat_room_member (room_id, member_id),
    KEY idx_chat_room_member_member_id (member_id),
    KEY idx_chat_room_member_deleted_yn (deleted_yn),
    CONSTRAINT fk_chat_room_member_room
        FOREIGN KEY (room_id) REFERENCES chat_room(room_id),
    CONSTRAINT fk_chat_room_member_member
        FOREIGN KEY (member_id) REFERENCES members(member_id)
);

CREATE TABLE IF NOT EXISTS chat_message (
    message_id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'MESSAGE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_yn CHAR(1) NOT NULL DEFAULT 'N',
    PRIMARY KEY (message_id),
    KEY idx_chat_message_room_id (room_id),
    KEY idx_chat_message_sender_id (sender_id),
    KEY idx_chat_message_deleted_yn (deleted_yn),
    CONSTRAINT fk_chat_message_room
        FOREIGN KEY (room_id) REFERENCES chat_room(room_id),
    CONSTRAINT fk_chat_message_sender
        FOREIGN KEY (sender_id) REFERENCES members(member_id)
);
