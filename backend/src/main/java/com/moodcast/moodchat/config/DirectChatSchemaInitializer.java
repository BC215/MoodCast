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
        ensureColumn("chat_tbl", "sender_hidden_at", "DATETIME(6) NULL AFTER sender_deleted_yn");
        ensureColumn("chat_tbl", "receiver_hidden_at", "DATETIME(6) NULL AFTER sender_hidden_at");
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
