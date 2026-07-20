package com.puyoexpress.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OriginValidationFilterTest {

    private final OriginValidationFilter filter =
            new OriginValidationFilter(Set.of("https://puyo.example"));

    @Test
    void rejectsCrossOriginMutation() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/orders");
        request.addHeader("Origin", "https://attacker.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void acceptsConfiguredOrigin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/orders");
        request.addHeader("Origin", "https://puyo.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }
}
