package com.puyoexpress.backend.security;

import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SensitiveStringConverterTest {

    @Test
    void encryptsWithRandomIvAndDecryptsWithoutDataLoss() {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        SensitiveStringConverter converter = new SensitiveStringConverter(Base64.getEncoder().encodeToString(key));

        String first = converter.convertToDatabaseColumn("0981234567");
        String second = converter.convertToDatabaseColumn("0981234567");

        assertTrue(first.startsWith("enc:v1:"));
        assertNotEquals(first, second);
        assertEquals("0981234567", converter.convertToEntityAttribute(first));
    }

    @Test
    void acceptsLegacyPlaintextForSafeStartupMigration() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        SensitiveStringConverter converter = new SensitiveStringConverter(key);
        assertEquals("legacy", converter.convertToEntityAttribute("legacy"));
    }

    @Test
    void rejectsTamperedCiphertext() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        SensitiveStringConverter converter = new SensitiveStringConverter(key);
        String encrypted = converter.convertToDatabaseColumn("dato sensible");
        String tampered = encrypted.substring(0, encrypted.length() - 2) + "AA";

        assertThrows(IllegalStateException.class, () -> converter.convertToEntityAttribute(tampered));
    }
}
