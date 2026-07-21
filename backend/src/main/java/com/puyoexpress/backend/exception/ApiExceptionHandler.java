package com.puyoexpress.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;
import jakarta.validation.ConstraintViolationException;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage() == null ? "Datos inválidos." : error.getDefaultMessage())
                .orElse("Datos inválidos.");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableBody() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "La solicitud no contiene datos válidos."));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation() {
        return ResponseEntity.badRequest().body(Map.of("error", "Uno de los valores no es válido."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "La operación entra en conflicto con datos existentes."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllUncaughtException(Exception exception) {
        // Loguear internamente si es necesario
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Ha ocurrido un error interno en el servidor."));
    }
}
