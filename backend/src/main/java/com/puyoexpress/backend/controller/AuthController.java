package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.dto.AuthResponse;
import com.puyoexpress.backend.dto.LoginRequest;
import com.puyoexpress.backend.dto.RegisterRequest;
import com.puyoexpress.backend.exception.RegistrationException;
import com.puyoexpress.backend.security.UserDetailsImpl;
import com.puyoexpress.backend.service.AuthService;
import com.puyoexpress.backend.service.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for authentication endpoints.
 * All endpoints are public (configured in SecurityConfig).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SecurityAuditService audit;

    public AuthController(AuthService authService, SecurityAuditService audit) {
        this.authService = authService;
        this.audit = audit;
    }

    /**
     * POST /api/auth/login
     * Authenticates a user and sets the JWT as an HttpOnly cookie.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            AuthService.LoginResult result = authService.login(request);
            audit.record("AUTH_LOGIN", "SUCCESS", result.response().getUsername(),
                    httpRequest.getRemoteAddr(), "role=" + result.response().getRole());
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, result.cookie().toString())
                    .body(result.response());
        } catch (AuthenticationException exception) {
            audit.record("AUTH_LOGIN", "FAILURE", request.getUsername(),
                    httpRequest.getRemoteAddr(), "invalid_credentials");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Credenciales incorrectas."));
        }
    }

    /**
     * POST /api/auth/register
     * Creates a new user account.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse response = authService.register(request);
            audit.record("AUTH_REGISTER", "SUCCESS", response.getUsername(),
                    httpRequest.getRemoteAddr(), "role=" + response.getRole());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RegistrationException e) {
            audit.record("AUTH_REGISTER", "FAILURE", request.getUsername(),
                    httpRequest.getRemoteAddr(), "registration_rejected code=" + e.getCode());
            throw e;
        }
    }

    /**
     * POST /api/auth/logout
     * Clears the JWT cookie.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = authentication != null ? authentication.getName() : "anonymous";
        ResponseCookie cookie = authService.logout();
        audit.record("AUTH_LOGOUT", "SUCCESS", actor, httpRequest.getRemoteAddr(), "cookie_cleared");

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("message", "Sesión cerrada exitosamente."));
    }

    /**
     * GET /api/auth/me
     * Returns the currently authenticated user's info.
     * Requires a valid JWT cookie.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.noContent().build();
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        AuthResponse response = new AuthResponse(
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                role
        );

        return ResponseEntity.ok(response);
    }
}
