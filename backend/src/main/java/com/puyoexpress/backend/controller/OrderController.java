package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Coordinates;
import com.puyoexpress.backend.model.Driver;
import com.puyoexpress.backend.model.Landmark;
import com.puyoexpress.backend.model.MenuItem;
import com.puyoexpress.backend.model.Order;
import com.puyoexpress.backend.model.OrderItem;
import com.puyoexpress.backend.model.Restaurant;
import com.puyoexpress.backend.repository.DriverRepository;
import com.puyoexpress.backend.repository.LandmarkRepository;
import com.puyoexpress.backend.repository.MenuItemRepository;
import com.puyoexpress.backend.repository.OrderRepository;
import com.puyoexpress.backend.repository.RestaurantRepository;
import com.puyoexpress.backend.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.of(
            "pending", Set.of("accepted"),
            "accepted", Set.of("preparing"),
            "preparing", Set.of("ready_for_pickup"),
            "ready_for_pickup", Set.of("picked_up"),
            "picked_up", Set.of("delivered")
    );

    private final OrderRepository orderRepository;
    private final RestaurantRepository restaurantRepository;
    private final LandmarkRepository landmarkRepository;
    private final MenuItemRepository menuItemRepository;
    private final DriverRepository driverRepository;

    public OrderController(OrderRepository orderRepository,
                           RestaurantRepository restaurantRepository,
                           LandmarkRepository landmarkRepository,
                           MenuItemRepository menuItemRepository,
                           DriverRepository driverRepository) {
        this.orderRepository = orderRepository;
        this.restaurantRepository = restaurantRepository;
        this.landmarkRepository = landmarkRepository;
        this.menuItemRepository = menuItemRepository;
        this.driverRepository = driverRepository;
    }

    @GetMapping
    public List<Order> getAllOrders(Authentication authentication) {
        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
        if (isCustomer) {
            return orderRepository.findByCustomerId(((UserDetailsImpl) authentication.getPrincipal()).getId());
        }
        return orderRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_CUSTOMER')")
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody Order request, Authentication authentication) {
        if (request.getRestaurantId() == null || request.getDeliveryLandmarkId() == null) {
            return badRequest("El restaurante y el punto de entrega son obligatorios.");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return badRequest("El pedido debe contener al menos un producto.");
        }

        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId()).orElse(null);
        Landmark landmark = landmarkRepository.findById(request.getDeliveryLandmarkId()).orElse(null);
        if (restaurant == null || landmark == null) {
            return badRequest("El restaurante o punto de entrega no existe.");
        }

        List<OrderItem> requestedItems = new ArrayList<>(request.getItems());
        request.setItems(new ArrayList<>());
        double foodTotal = 0;

        for (OrderItem requestedItem : requestedItems) {
            if (requestedItem.getItem() == null || requestedItem.getItem().getId() == null
                    || requestedItem.getQuantity() == null || requestedItem.getQuantity() <= 0) {
                return badRequest("Uno de los productos del pedido no es válido.");
            }

            MenuItem menuItem = menuItemRepository.findById(requestedItem.getItem().getId()).orElse(null);
            if (menuItem == null || menuItem.getRestaurant() == null
                    || !menuItem.getRestaurant().getId().equals(restaurant.getId())) {
                return badRequest("Uno de los productos no pertenece al restaurante seleccionado.");
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setItem(menuItem);
            orderItem.setQuantity(requestedItem.getQuantity());
            request.addOrderItem(orderItem);
            foodTotal += menuItem.getPrice() * requestedItem.getQuantity();
        }

        double distanceKm = calculateDistanceKm(restaurant.getPosition(), landmark.getPosition());
        double commission = 2 + Math.max(0, distanceKm - 2) * 0.5;
        foodTotal = roundMoney(foodTotal);
        commission = roundMoney(commission);

        request.setRestaurantName(restaurant.getName());
        request.setCustomerId(((UserDetailsImpl) authentication.getPrincipal()).getId());
        request.setDeliveryLandmark(landmark.getName());
        request.setDestination(landmark.getPosition());
        request.setFoodTotal(foodTotal);
        request.setCommission(commission);
        request.setDistanceKm(distanceKm);
        request.setTotal(roundMoney(foodTotal + commission));
        request.setStatus("pending");
        request.setRouteProgress(0);
        request.setDriverId(null);
        request.setDriverName(null);

        return ResponseEntity.ok(orderRepository.save(request));
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        String newStatus = body.get("status");
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of());
        if (newStatus == null || !allowed.contains(newStatus)) {
            return badRequest("Transición de estado no permitida.");
        }
        String requiredAuthority = Set.of("accepted", "preparing", "ready_for_pickup").contains(newStatus)
                ? "ROLE_RESTAURANT" : "ROLE_DRIVER";
        boolean authorized = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals(requiredAuthority));
        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Tu rol no puede realizar esta transición."));
        }
        if ("ROLE_DRIVER".equals(requiredAuthority)) {
            Long currentDriverId = currentDriverId();
            if (currentDriverId == null || order.getDriverId() == null
                    || !order.getDriverId().equals(currentDriverId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Este pedido no está asignado a tu perfil de repartidor."));
            }
        }
        if ("picked_up".equals(newStatus) && order.getDriverId() == null) {
            return badRequest("El pedido debe tener un repartidor asignado.");
        }

        if (order.getDriverId() != null) {
            Driver driver = driverRepository.findById(order.getDriverId()).orElse(null);
            if (driver != null && "picked_up".equals(newStatus)) {
                driver.setStatus("delivering");
                driverRepository.save(driver);
            } else if (driver != null && "delivered".equals(newStatus)) {
                driver.setStatus("active");
                driver.setCompletedDeliveries(defaultValue(driver.getCompletedDeliveries()) + 1);
                driver.setTotalEarnings(roundMoney(defaultValue(driver.getTotalEarnings()) + order.getCommission()));
                driverRepository.save(driver);
                order.setRouteProgress(100);
            }
        }

        order.setStatus(newStatus);
        return ResponseEntity.ok(orderRepository.save(order));
    }

    @PutMapping("/{id}/assign-driver")
    @PreAuthorize("hasAnyAuthority('ROLE_RESTAURANT', 'ROLE_DRIVER')")
    public ResponseEntity<?> assignDriver(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!"ready_for_pickup".equals(order.getStatus()) || order.getDriverId() != null) {
            return badRequest("El pedido no está disponible para asignación.");
        }

        Object driverIdValue = body.get("driverId");
        if (driverIdValue == null) return badRequest("El repartidor es obligatorio.");

        Long driverId;
        try {
            driverId = Long.valueOf(driverIdValue.toString());
        } catch (NumberFormatException exception) {
            return badRequest("El repartidor no es válido.");
        }

        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null || !"active".equals(driver.getStatus())) {
            return badRequest("El repartidor no está disponible.");
        }
        boolean isDriver = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver) {
            Long currentDriverId = currentDriverId();
            if (currentDriverId == null || !currentDriverId.equals(driver.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Solo puedes aceptar pedidos con tu propio perfil."));
            }
        }

        order.setDriverId(driver.getId());
        order.setDriverName(driver.getName());
        return ResponseEntity.ok(orderRepository.save(order));
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    private Long currentDriverId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            return null;
        }
        return driverRepository.findByUserId(userDetails.getId())
                .map(Driver::getId)
                .orElse(null);
    }

    private double calculateDistanceKm(Coordinates origin, Coordinates destination) {
        if (origin == null || destination == null) return 0;
        double earthRadiusKm = 6371;
        double dLat = Math.toRadians(destination.getLat() - origin.getLat());
        double dLng = Math.toRadians(destination.getLng() - origin.getLng());
        double lat1 = Math.toRadians(origin.getLat());
        double lat2 = Math.toRadians(destination.getLat());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100.0) / 100.0;
    }

    private double roundMoney(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private int defaultValue(Integer value) {
        return value == null ? 0 : value;
    }

    private double defaultValue(Double value) {
        return value == null ? 0 : value;
    }
}
