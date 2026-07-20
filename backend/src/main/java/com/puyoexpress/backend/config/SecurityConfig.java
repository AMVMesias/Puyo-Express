package com.puyoexpress.backend.config;

import com.puyoexpress.backend.security.JwtAuthFilter;
import com.puyoexpress.backend.security.AuditLogFilter;
import com.puyoexpress.backend.security.RequestSizeLimitFilter;
import com.puyoexpress.backend.security.UserDetailsServiceImpl;
import com.puyoexpress.backend.security.AuthRateLimitFilter;
import com.puyoexpress.backend.security.OriginValidationFilter;
import com.puyoexpress.backend.service.SecurityAuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Main Spring Security configuration.
 *
 * Security measures implemented:
 * - Stateless sessions (JWT-based)
 * - BCrypt password hashing
 * - CORS restricted to frontend origins
 * - Browser CSRF protection through strict Origin validation and SameSite cookies
 * - Role-based endpoint access control
 * - JWT filter before UsernamePasswordAuthenticationFilter
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.http.max-request-bytes:1048576}")
    private int maxRequestBytes;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService, JwtAuthFilter jwtAuthFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public RequestSizeLimitFilter requestSizeLimitFilter() {
        return new RequestSizeLimitFilter(maxRequestBytes);
    }

    @Bean
    public AuthRateLimitFilter authRateLimitFilter() {
        return new AuthRateLimitFilter(10, 15 * 60 * 1000L);
    }

    @Bean
    public OriginValidationFilter originValidationFilter() {
        return new OriginValidationFilter(configuredOrigins());
    }

    @Bean
    public AuditLogFilter auditLogFilter(SecurityAuditService auditService) {
        return new AuditLogFilter(auditService);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.copyOf(configuredOrigins()));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "X-Request-ID"));
        configuration.setAllowCredentials(true); // Required for HttpOnly cookies
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           RequestSizeLimitFilter requestSizeLimitFilter,
                                           AuditLogFilter auditLogFilter,
                                           AuthRateLimitFilter authRateLimitFilter,
                                           OriginValidationFilter originValidationFilter) throws Exception {
        http
            // CORS configuration
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Browser CSRF is rejected by strict Origin validation and SameSite cookies.
            .csrf(csrf -> csrf.disable())

            // Stateless session management (no server-side sessions)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .headers(headers -> headers
                .contentTypeOptions(contentType -> {})
                .frameOptions(frame -> frame.deny())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(), payment=()"))
                .addHeaderWriter(new StaticHeadersWriter("Cache-Control", "no-store"))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'none'; frame-ancestors 'none'"))
            )

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Role-specific endpoints
                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            // Register authentication provider
            .authenticationProvider(authenticationProvider())

            // Add JWT filter before the default authentication filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(requestSizeLimitFilter, JwtAuthFilter.class)
            .addFilterAfter(originValidationFilter, RequestSizeLimitFilter.class)
            .addFilterAfter(authRateLimitFilter, OriginValidationFilter.class)
            .addFilterAfter(auditLogFilter, JwtAuthFilter.class);

        return http.build();
    }

    private Set<String> configuredOrigins() {
        Set<String> origins = new LinkedHashSet<>();
        Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .forEach(origin -> {
                    if ("*".equals(origin) || (!origin.startsWith("http://") && !origin.startsWith("https://"))) {
                        throw new IllegalStateException("CORS_ALLOWED_ORIGINS contiene un origen no permitido.");
                    }
                    origins.add(origin);
                });
        if (origins.isEmpty()) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS debe contener al menos un origen.");
        }
        return origins;
    }
}
