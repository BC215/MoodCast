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
        ensureColumn("chat_room", "room_type", "VARCHAR(20) NOT NULL DEFAULT 'GROUP'"); // PostgreSQL does not support 'AFTER'
        ensureColumn("chat_room_member", "hidden_at", "TIMESTAMP(6) NULL"); // DATETIME(6) -> TIMESTAMP(6), 'AFTER' 제거
        ensureColumn("chat_room_member", "left_at", "TIMESTAMP(6) NULL"); // DATETIME(6) -> TIMESTAMP(6), 'AFTER' 제거
        ensureColumn("chat_room_member", "last_read_at", "TIMESTAMP(6) NULL"); // DATETIME(6) -> TIMESTAMP(6), 'AFTER' 제거
        ensureColumn("chat_room_member", "last_read_message_id", "BIGINT NULL"); // 'AFTER' 제거
        ensureColumn("chat_room_member", "is_active", "BOOLEAN NOT NULL DEFAULT TRUE"); // TINYINT(1) -> BOOLEAN, DEFAULT 1 -> DEFAULT TRUE, 'AFTER' 제거
        ensureColumn("chat_message", "message_type", "VARCHAR(20) NOT NULL DEFAULT 'MESSAGE'"); // 'AFTER' 제거
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
                WHERE table_catalog = current_database() -- 현재 데이터베이스 이름을 가져옴 (MySQL의 DATABASE()와 유사)
                  AND table_schema = 'public' -- 일반적으로 테이블이 생성되는 기본 스키마 (필요시 다른 스키마 이름으로 변경)
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
