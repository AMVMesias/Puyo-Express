package com.puyoexpress.backend.dto;

import com.puyoexpress.backend.model.Coordinates;
import com.puyoexpress.backend.model.Order;
import com.puyoexpress.backend.model.OrderItem;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long restaurantId,
        String restaurantName,
        String customerName,
        String customerPhone,
        List<OrderItem> items,
        Double total,
        Double foodTotal,
        Double commission,
        Double distanceKm,
        String deliveryAddress,
        Long deliveryLandmarkId,
        String deliveryLandmark,
        Coordinates destination,
        String status,
        Long driverId,
        String driverName,
        LocalDateTime createdAt,
        Integer routeProgress
) {
    public static OrderResponse from(Order order, boolean includePersonalData) {
        return new OrderResponse(
                order.getId(),
                order.getRestaurantId(),
                order.getRestaurantName(),
                includePersonalData ? order.getCustomerName() : null,
                includePersonalData ? order.getCustomerPhone() : null,
                order.getItems(),
                order.getTotal(),
                order.getFoodTotal(),
                order.getCommission(),
                order.getDistanceKm(),
                includePersonalData ? order.getDeliveryAddress() : null,
                order.getDeliveryLandmarkId(),
                order.getDeliveryLandmark(),
                includePersonalData ? order.getDestination() : null,
                order.getStatus(),
                order.getDriverId(),
                order.getDriverName(),
                order.getCreatedAt(),
                order.getRouteProgress()
        );
    }
}
