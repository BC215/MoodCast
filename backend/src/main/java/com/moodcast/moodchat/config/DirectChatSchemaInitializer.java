package com.moodcast.moodchat.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DirectChatSchemaInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureDirectChatSchema() {
        // MySQL DATETIME(6) -> PostgreSQL TIMESTAMP(6) NULL
        ensureColumn("chat_tbl", "sender_hidden_at", "TIMESTAMP(6) NULL");
        ensureColumn("chat_tbl", "receiver_hidden_at", "TIMESTAMP(6) NULL");
        // MySQL TINYINT NOT NULL DEFAULT '0' -> PostgreSQL BOOLEAN NOT NULL DEFAULT FALSE
        ensureColumn("chat_tbl", "sender_deleted_yn", "BOOLEAN NOT NULL DEFAULT FALSE");
        ensureColumn("chat_tbl", "receiver_deleted_yn", "BOOLEAN NOT NULL DEFAULT FALSE");
    }

    private void ensureColumn(String tableName, String columnName, String ddlFragment) {
        if (hasColumn(tableName, columnName)) {
            return;
        }

        // PostgreSQL does not support 'AFTER' keyword in ADD COLUMN
        jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + ddlFragment);
    }

    private boolean hasColumn(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_catalog = current_database() -- PostgreSQL equivalent for MySQL's DATABASE()
                  AND table_schema = 'public' -- Default schema in PostgreSQL
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