package com.puyoexpress.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRateLimitFilterTest {

    @Test
    void rejectsAttemptsAboveConfiguredLimit() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(2, 60_000);

        assertEquals(200, execute(filter).getStatus());
        assertEquals(200, execute(filter).getStatus());
        assertEquals(429, execute(filter).getStatus());
    }

    private MockHttpServletResponse execute(AuthRateLimitFilter filter) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("203.0.113.10");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
