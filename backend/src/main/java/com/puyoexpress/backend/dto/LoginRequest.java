package com.puyoexpress.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO for login requests. Accepts either username or email in the 'username' field.
 */
public class LoginRequest {

    @NotBlank(message = "El usuario o correo es obligatorio")
    @Size(max = 100, message = "El usuario o correo es demasiado largo")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(max = 120, message = "La contraseña es demasiado larga")
    private String password;

    public LoginRequest() {
    }

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
