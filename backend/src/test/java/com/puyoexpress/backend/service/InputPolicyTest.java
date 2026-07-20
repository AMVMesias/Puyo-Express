package com.puyoexpress.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InputPolicyTest {

    @Test
    void normalizesWhitespace() {
        assertEquals("María Pérez", InputPolicy.normalizeHumanText("  María   Pérez  "));
    }

    @Test
    void rejectsInvisibleAndControlCharacters() {
        assertTrue(InputPolicy.containsUnsafeControlCharacters("abc\u200Bdef"));
        assertTrue(InputPolicy.containsUnsafeControlCharacters("abc\ndef"));
        assertFalse(InputPolicy.containsUnsafeControlCharacters("Calle 10, Puyo"));
    }
}
