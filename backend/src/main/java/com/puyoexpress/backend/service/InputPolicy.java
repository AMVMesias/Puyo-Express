package com.puyoexpress.backend.service;

import java.text.Normalizer;

public final class InputPolicy {

    private InputPolicy() {
    }

    public static String normalizeHumanText(String value) {
        if (value == null) return null;
        return Normalizer.normalize(value, Normalizer.Form.NFC).trim().replaceAll(" {2,}", " ");
    }

    public static boolean containsUnsafeControlCharacters(String value) {
        if (value == null) return false;
        return value.codePoints().anyMatch(codePoint ->
                Character.isISOControl(codePoint) || Character.getType(codePoint) == Character.FORMAT);
    }
}
