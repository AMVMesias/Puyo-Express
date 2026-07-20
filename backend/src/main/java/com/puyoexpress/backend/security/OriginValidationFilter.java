package com.puyoexpress.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

public class OriginValidationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final Set<String> allowedOrigins;

    public OriginValidationFilter(Set<String> allowedOrigins) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return SAFE_METHODS.contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (origin != null && !allowedOrigins.contains(origin)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"error\":\"Origen de solicitud no permitido.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
