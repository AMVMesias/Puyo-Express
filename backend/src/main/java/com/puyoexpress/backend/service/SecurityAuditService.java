package com.puyoexpress.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SecurityAuditService {

    private static final Logger AUDIT = LoggerFactory.getLogger("SECURITY_AUDIT");

    public void record(String event, String outcome, String actor, String sourceIp, String details) {
        AUDIT.info("event={} outcome={} actor={} sourceIp={} details={}",
                clean(event), clean(outcome), clean(actor), clean(sourceIp), clean(details));
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) return "-";
        String sanitized = value.replace('\n', '_').replace('\r', '_').replace('\t', '_');
        return sanitized.length() > 160 ? sanitized.substring(0, 160) : sanitized;
    }
}
