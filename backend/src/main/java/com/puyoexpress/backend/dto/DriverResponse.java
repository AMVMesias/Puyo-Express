package com.puyoexpress.backend.dto;

import com.puyoexpress.backend.model.Coordinates;
import com.puyoexpress.backend.model.Driver;

public record DriverResponse(
        Long id,
        Long userId,
        String name,
        String zone,
        String vehicle,
        Double rating,
        String status,
        Double totalEarnings,
        Integer completedDeliveries,
        Coordinates position
) {
    public static DriverResponse from(Driver driver, boolean includePrivateMetrics) {
        return new DriverResponse(
                driver.getId(),
                includePrivateMetrics ? driver.getUserId() : null,
                driver.getName(),
                driver.getZone(),
                driver.getVehicle(),
                driver.getRating(),
                driver.getStatus(),
                includePrivateMetrics ? driver.getTotalEarnings() : null,
                includePrivateMetrics ? driver.getCompletedDeliveries() : null,
                driver.getPosition()
        );
    }
}
