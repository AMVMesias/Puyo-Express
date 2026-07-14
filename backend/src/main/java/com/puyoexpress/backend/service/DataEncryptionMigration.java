package com.puyoexpress.backend.service;

import com.puyoexpress.backend.security.SensitiveStringConverter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** One-way migration of legacy plaintext PII into the encrypted column format. */
@Component
public class DataEncryptionMigration {

    private static final Logger LOGGER = LoggerFactory.getLogger(DataEncryptionMigration.class);
    private final JdbcTemplate jdbcTemplate;
    private final SensitiveStringConverter converter;

    public DataEncryptionMigration(JdbcTemplate jdbcTemplate, SensitiveStringConverter converter) {
        this.jdbcTemplate = jdbcTemplate;
        this.converter = converter;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void encryptLegacyValues() {
        int migrated = migrate("orders", "customer_phone")
                + migrate("orders", "delivery_address")
                + migrate("drivers", "phone");
        if (migrated > 0) {
            LOGGER.info("Migrated {} legacy sensitive values to AES-GCM storage.", migrated);
        }
    }

    private int migrate(String table, String column) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, " + column + " AS value FROM " + table
                        + " WHERE " + column + " IS NOT NULL AND " + column + " NOT LIKE 'enc:v1:%'");
        for (Map<String, Object> row : rows) {
            String encrypted = converter.convertToDatabaseColumn(row.get("value").toString());
            jdbcTemplate.update("UPDATE " + table + " SET " + column + " = ? WHERE id = ?",
                    encrypted, row.get("id"));
        }
        return rows.size();
    }
}
