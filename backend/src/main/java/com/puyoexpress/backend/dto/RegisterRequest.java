package com.puyoexpress.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

/**
 * DTO for user registration requests.
 */
public class RegisterRequest {

    @NotBlank(message = "El nombre de usuario es obligatorio")
    @Size(min = 3, max = 50, message = "El usuario debe tener entre 3 y 50 caracteres")
    @Pattern(
            regexp = "^[\\p{L}][\\p{L}\\p{N}._-]{2,49}$",
            message = "El usuario debe empezar con una letra y solo puede contener letras, números, punto, guion o guion bajo"
    )
    private String username;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    @Size(max = 100)
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 12, max = 120, message = "La contraseña debe tener entre 12 y 120 caracteres")
    private String password;

    @NotBlank(message = "El rol es obligatorio")
    @Size(max = 20, message = "El rol no es válido")
    private String role;

    public RegisterRequest() {
    }

    public RegisterRequest(String username, String email, String password, String role) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
