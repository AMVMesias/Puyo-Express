package com.puyoexpress.backend.exception;

import org.springframework.http.HttpStatus;

public class RegistrationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final String field;

    public RegistrationException(HttpStatus status, String code, String field, String message) {
        super(message);
        this.status = status;
        this.code = code;
        this.field = field;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public String getField() {
        return field;
    }
}
