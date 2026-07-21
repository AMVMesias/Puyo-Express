package com.puyoexpress.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void returnsFieldAndConflictCodeForDuplicateEmail() {
        RegistrationException exception = new RegistrationException(
                HttpStatus.CONFLICT,
                "EMAIL_TAKEN",
                "email",
                "El correo electrónico ya está registrado."
        );

        ResponseEntity<Map<String, Object>> response = handler.handleRegistration(exception);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("EMAIL_TAKEN", response.getBody().get("code"));
        assertEquals(
                Map.of("email", "El correo electrónico ya está registrado."),
                response.getBody().get("fieldErrors")
        );
    }

    @Test
    void doesNotExposeAFieldWhenTheErrorIsGeneral() {
        RegistrationException exception = new RegistrationException(
                HttpStatus.BAD_REQUEST,
                "INVALID_INPUT",
                null,
                "Los datos no son válidos."
        );

        ResponseEntity<Map<String, Object>> response = handler.handleRegistration(exception);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(false, response.getBody().containsKey("fieldErrors"));
    }
}
