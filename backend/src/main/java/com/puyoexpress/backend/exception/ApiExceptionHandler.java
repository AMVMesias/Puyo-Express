package com.puyoexpress.backend.exception;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(
                        error.getField(),
                        error.getDefaultMessage() == null ? "El valor no es válido." : error.getDefaultMessage()
                )
        );

        String firstMessage = fieldErrors.values().stream()
                .findFirst()
                .orElse("Revisa los datos ingresados.");

        return ResponseEntity.badRequest().body(errorBody(
                "VALIDATION_ERROR",
                firstMessage,
                fieldErrors
        ));
    }

    @ExceptionHandler(RegistrationException.class)
    public ResponseEntity<Map<String, Object>> handleRegistration(RegistrationException exception) {
        Map<String, String> fieldErrors = exception.getField() == null
                ? Map.of()
                : Map.of(exception.getField(), exception.getMessage());
        return ResponseEntity.status(exception.getStatus()).body(errorBody(
                exception.getCode(),
                exception.getMessage(),
                fieldErrors
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody() {
        return ResponseEntity.badRequest().body(errorBody(
                "INVALID_JSON",
                "La solicitud no contiene un JSON válido.",
                Map.of()
        ));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation() {
        return ResponseEntity.badRequest().body(errorBody(
                "CONSTRAINT_VIOLATION",
                "Uno de los valores no es válido.",
                Map.of()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorBody(
                "DATA_CONFLICT",
                "La operación entra en conflicto con datos existentes.",
                Map.of()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllUncaughtException(Exception exception) {
        logger.error("Unhandled API exception", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody(
                "INTERNAL_ERROR",
                "Ha ocurrido un error interno en el servidor.",
                Map.of()
        ));
    }

    private Map<String, Object> errorBody(String code,
                                          String message,
                                          Map<String, String> fieldErrors) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("error", message);
        if (!fieldErrors.isEmpty()) {
            body.put("fieldErrors", fieldErrors);
        }
        return body;
    }
}
