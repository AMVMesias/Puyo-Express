package com.puyoexpress.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * General web configuration.
 * CORS is handled by SecurityConfig to ensure Spring Security
 * processes CORS before authentication filters.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    // CORS is managed in SecurityConfig via CorsConfigurationSource.
    // Additional web-level customizations can be added here.
}
