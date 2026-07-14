package com.puyoexpress.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RequestSizeLimitFilterTest {

    @Test
    void rejectsOversizedJsonBody() throws Exception {
        RequestSizeLimitFilter filter = new RequestSizeLimitFilter(16);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setContentType("application/json");
        request.setContent("{\"value\":\"0123456789\"}".getBytes());
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(413, response.getStatus());
    }

    @Test
    void passesBodyWithinLimit() throws Exception {
        RequestSizeLimitFilter filter = new RequestSizeLimitFilter(64);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setContent("{}".getBytes());
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }
}
