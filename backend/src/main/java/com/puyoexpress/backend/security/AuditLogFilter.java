package com.puyoexpress.backend.security;

import com.puyoexpress.backend.service.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class AuditLogFilter extends OncePerRequestFilter {

    private final SecurityAuditService audit;

    public AuditLogFilter(SecurityAuditService audit) {
        this.audit = audit;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        response.setHeader("X-Request-ID", requestId);
        long started = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String actor = authentication != null && authentication.isAuthenticated()
                    ? authentication.getName() : "anonymous";
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            audit.record("HTTP_REQUEST", Integer.toString(response.getStatus()), actor,
                    request.getRemoteAddr(), "requestId=" + requestId + " method=" + request.getMethod()
                            + " path=" + request.getRequestURI() + " durationMs=" + durationMs);
        }
    }
}
