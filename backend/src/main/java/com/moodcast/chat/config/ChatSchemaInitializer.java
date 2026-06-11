package com.moodcast.chat.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatSchemaInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureGroupChatSchema() {
        ensureColumn("chat_room", "room_type", "VARCHAR(20) NOT NULL DEFAULT 'GROUP' AFTER room_id");
        ensureColumn("chat_room_member", "hidden_at", "DATETIME(6) NULL AFTER joined_at");
        ensureColumn("chat_room_member", "left_at", "DATETIME(6) NULL AFTER hidden_at");
        ensureColumn("chat_room_member", "last_read_at", "DATETIME(6) NULL AFTER left_at");
        ensureColumn("chat_room_member", "last_read_message_id", "BIGINT NULL AFTER last_read_at");
        ensureColumn("chat_room_member", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER last_read_message_id");
        ensureColumn("chat_message", "message_type", "VARCHAR(20) NOT NULL DEFAULT 'MESSAGE' AFTER content");
    }

    private void ensureColumn(String tableName, String columnName, String ddlFragment) {
        if (hasColumn(tableName, columnName)) {
            return;
        }

        jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + ddlFragment);
    }

    private boolean hasColumn(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name = ?
                """,
                Integer.class,
                tableName,
                columnName
        );

        return count != null && count > 0;
    }
}
