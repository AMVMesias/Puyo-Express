package com.puyoexpress.backend.model;

import com.puyoexpress.backend.security.SensitiveStringConverter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "restaurant_id")
    private Long restaurantId;

    @Column(name = "customer_id")
    private Long customerId;
    
    @Column(name = "restaurant_name")
    private String restaurantName;
    
    @Column(name = "customer_name")
    private String customerName;
    
    @Column(name = "customer_phone", length = 512)
    @Convert(converter = SensitiveStringConverter.class)
    private String customerPhone;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    private Double total;
    
    @Column(name = "food_total")
    private Double foodTotal;
    
    private Double commission;
    
    @Column(name = "distance_km")
    private Double distanceKm;
    
    @Column(name = "delivery_address", length = 2048)
    @Convert(converter = SensitiveStringConverter.class)
    private String deliveryAddress;
    
    @Column(name = "delivery_landmark_id")
    private Long deliveryLandmarkId;
    
    @Column(name = "delivery_landmark")
    private String deliveryLandmark;

    @Embedded
    private Coordinates destination;

    private String status; // pending, accepted, preparing, ready_for_pickup, picked_up, delivered
    
    @Column(name = "driver_id")
    private Long driverId;
    
    @Column(name = "driver_name")
    private String driverName;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "route_progress")
    private Integer routeProgress = 0;

    public Order() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRestaurantId() { return restaurantId; }
    public void setRestaurantId(Long restaurantId) { this.restaurantId = restaurantId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getRestaurantName() { return restaurantName; }
    public void setRestaurantName(String restaurantName) { this.restaurantName = restaurantName; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }

    public void addOrderItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeOrderItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }

    public Double getTotal() { return total; }
    public void setTotal(Double total) { this.total = total; }

    public Double getFoodTotal() { return foodTotal; }
    public void setFoodTotal(Double foodTotal) { this.foodTotal = foodTotal; }

    public Double getCommission() { return commission; }
    public void setCommission(Double commission) { this.commission = commission; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public Long getDeliveryLandmarkId() { return deliveryLandmarkId; }
    public void setDeliveryLandmarkId(Long deliveryLandmarkId) { this.deliveryLandmarkId = deliveryLandmarkId; }

    public String getDeliveryLandmark() { return deliveryLandmark; }
    public void setDeliveryLandmark(String deliveryLandmark) { this.deliveryLandmark = deliveryLandmark; }

    public Coordinates getDestination() { return destination; }
    public void setDestination(Coordinates destination) { this.destination = destination; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Integer getRouteProgress() { return routeProgress; }
    public void setRouteProgress(Integer routeProgress) { this.routeProgress = routeProgress; }
}
