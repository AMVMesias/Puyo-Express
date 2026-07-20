package com.puyoexpress.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class AuthRateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final long windowMillis;
    private final Clock clock;

    public AuthRateLimitFilter(int maxAttempts, long windowMillis) {
        this(maxAttempts, windowMillis, Clock.systemUTC());
    }

    AuthRateLimitFilter(int maxAttempts, long windowMillis, Clock clock) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMillis;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) return true;
        String path = request.getRequestURI();
        return !"/api/auth/login".equals(path) && !"/api/auth/register".equals(path);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        long now = clock.millis();
        String key = request.getRemoteAddr() + ":" + request.getRequestURI();
        Window window = windows.compute(key, (ignored, current) -> {
            if (current == null || now - current.startedAt >= windowMillis) {
                return new Window(now, 1);
            }
            return new Window(current.startedAt, current.attempts + 1);
        });

        if (window.attempts > maxAttempts) {
            long retrySeconds = Math.max(1, (windowMillis - (now - window.startedAt)) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", Long.toString(retrySeconds));
            response.setContentType("application/json");
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"error\":\"Demasiados intentos. Intenta nuevamente más tarde.\"}");
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= windowMillis);
        }
        filterChain.doFilter(request, response);
    }

    private record Window(long startedAt, int attempts) {
    }
}
