package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.dto.CreateOrderItemRequest;
import com.puyoexpress.backend.dto.CreateOrderRequest;
import com.puyoexpress.backend.dto.OrderResponse;
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
import com.puyoexpress.backend.service.InputPolicy;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final int MAX_TOTAL_UNITS = 200;
    private static final BigDecimal MAX_ORDER_TOTAL = new BigDecimal("100000.00");
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
    public ResponseEntity<?> getOrders(Authentication authentication) {
        UserDetailsImpl user = principal(authentication);
        if (hasAuthority(authentication, "ROLE_CUSTOMER")) {
            return ResponseEntity.ok(toResponses(orderRepository.findByCustomerId(user.getId()), true));
        }
        if (hasAuthority(authentication, "ROLE_RESTAURANT")) {
            Restaurant restaurant = restaurantRepository.findByUserId(user.getId()).orElse(null);
            if (restaurant == null) {
                return forbidden("Tu cuenta no tiene un restaurante asociado.");
            }
            return ResponseEntity.ok(toResponses(orderRepository.findByRestaurantId(restaurant.getId()), true));
        }
        if (hasAuthority(authentication, "ROLE_DRIVER")) {
            Driver driver = driverRepository.findByUserId(user.getId()).orElse(null);
            if (driver == null) {
                return forbidden("Tu cuenta no tiene un perfil de repartidor asociado.");
            }
            Map<Long, OrderResponse> visible = new LinkedHashMap<>();
            orderRepository.findByDriverId(driver.getId())
                    .forEach(order -> visible.put(order.getId(), OrderResponse.from(order, true)));
            orderRepository.findByStatusAndDriverIdIsNull("ready_for_pickup")
                    .forEach(order -> visible.putIfAbsent(order.getId(), OrderResponse.from(order, false)));
            return ResponseEntity.ok(new ArrayList<>(visible.values()));
        }
        return forbidden("Tu rol no puede consultar pedidos.");
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_CUSTOMER')")
    @Transactional
    public ResponseEntity<?> createOrder(@Valid @RequestBody CreateOrderRequest request,
                                         Authentication authentication) {
        String customerName = InputPolicy.normalizeHumanText(request.getCustomerName());
        String deliveryAddress = InputPolicy.normalizeHumanText(request.getDeliveryAddress());
        if (InputPolicy.containsUnsafeControlCharacters(customerName)
                || InputPolicy.containsUnsafeControlCharacters(deliveryAddress)) {
            return badRequest("Los textos contienen caracteres de control o invisibles no permitidos.");
        }

        Restaurant restaurant = restaurantRepository.findById(request.getRestaurantId()).orElse(null);
        Landmark landmark = landmarkRepository.findById(request.getDeliveryLandmarkId()).orElse(null);
        if (restaurant == null || landmark == null) {
            return badRequest("El restaurante o punto de entrega no existe.");
        }

        Set<Long> itemIds = new HashSet<>();
        int totalUnits = 0;
        for (CreateOrderItemRequest item : request.getItems()) {
            if (!itemIds.add(item.getMenuItemId())) {
                return badRequest("No se permite repetir el mismo producto en varias líneas.");
            }
            totalUnits += item.getQuantity();
        }
        if (totalUnits > MAX_TOTAL_UNITS) {
            return badRequest("El pedido supera el máximo de 200 unidades.");
        }

        Map<Long, MenuItem> menuItems = new HashMap<>();
        menuItemRepository.findAllById(itemIds).forEach(item -> menuItems.put(item.getId(), item));
        if (menuItems.size() != itemIds.size()) {
            return badRequest("Uno de los productos no existe.");
        }

        Order order = new Order();
        BigDecimal foodTotal = BigDecimal.ZERO;
        for (CreateOrderItemRequest requestedItem : request.getItems()) {
            MenuItem menuItem = menuItems.get(requestedItem.getMenuItemId());
            if (menuItem.getRestaurant() == null
                    || !menuItem.getRestaurant().getId().equals(restaurant.getId())) {
                return badRequest("Uno de los productos no pertenece al restaurante seleccionado.");
            }
            if (menuItem.getPrice() == null || !Double.isFinite(menuItem.getPrice())
                    || menuItem.getPrice() <= 0 || menuItem.getPrice() > 10_000) {
                return badRequest("Uno de los productos tiene un precio no válido.");
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setItem(menuItem);
            orderItem.setQuantity(requestedItem.getQuantity());
            order.addOrderItem(orderItem);
            foodTotal = foodTotal.add(
                    BigDecimal.valueOf(menuItem.getPrice()).multiply(BigDecimal.valueOf(requestedItem.getQuantity()))
            );
        }

        double distanceKm = calculateDistanceKm(restaurant.getPosition(), landmark.getPosition());
        BigDecimal commission = BigDecimal.valueOf(2 + Math.max(0, distanceKm - 2) * 0.5)
                .setScale(2, RoundingMode.HALF_UP);
        foodTotal = foodTotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = foodTotal.add(commission);
        if (total.compareTo(MAX_ORDER_TOTAL) > 0) {
            return badRequest("El total del pedido supera el máximo permitido.");
        }

        order.setRestaurantId(restaurant.getId());
        order.setRestaurantName(restaurant.getName());
        order.setCustomerId(principal(authentication).getId());
        order.setCustomerName(customerName);
        order.setCustomerPhone(request.getCustomerPhone());
        order.setDeliveryAddress(deliveryAddress);
        order.setDeliveryLandmarkId(landmark.getId());
        order.setDeliveryLandmark(landmark.getName());
        order.setDestination(landmark.getPosition());
        order.setFoodTotal(foodTotal.doubleValue());
        order.setCommission(commission.doubleValue());
        order.setDistanceKm(distanceKm);
        order.setTotal(total.doubleValue());
        order.setStatus("pending");
        order.setRouteProgress(0);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(OrderResponse.from(orderRepository.save(order), true));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_RESTAURANT', 'ROLE_DRIVER')")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestBody Map<String, String> body,
                                          Authentication authentication) {
        Order order = orderRepository.findByIdForUpdate(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();

        String newStatus = body.get("status");
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(order.getStatus(), Set.of());
        if (newStatus == null || !allowed.contains(newStatus)) {
            return badRequest("Transición de estado no permitida.");
        }

        boolean restaurantTransition = Set.of("accepted", "preparing", "ready_for_pickup").contains(newStatus);
        if (restaurantTransition) {
            if (!hasAuthority(authentication, "ROLE_RESTAURANT") || !ownsOrderRestaurant(order, authentication)) {
                return forbidden("Este pedido no pertenece a tu restaurante.");
            }
        } else {
            Long currentDriverId = currentDriverId(authentication);
            if (!hasAuthority(authentication, "ROLE_DRIVER") || currentDriverId == null
                    || order.getDriverId() == null || !order.getDriverId().equals(currentDriverId)) {
                return forbidden("Este pedido no está asignado a tu perfil de repartidor.");
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
        return ResponseEntity.ok(OrderResponse.from(orderRepository.save(order), true));
    }

    @PutMapping("/{id}/assign-driver")
    @PreAuthorize("hasAnyAuthority('ROLE_RESTAURANT', 'ROLE_DRIVER')")
    @Transactional
    public ResponseEntity<?> assignDriver(@PathVariable Long id,
                                          @RequestBody Map<String, Object> body,
                                          Authentication authentication) {
        Order order = orderRepository.findByIdForUpdate(id).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        if (!"ready_for_pickup".equals(order.getStatus()) || order.getDriverId() != null) {
            return badRequest("El pedido no está disponible para asignación.");
        }

        Long driverId = parsePositiveLong(body.get("driverId"));
        if (driverId == null) return badRequest("El repartidor no es válido.");

        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null || !"active".equals(driver.getStatus())) {
            return badRequest("El repartidor no está disponible.");
        }

        if (hasAuthority(authentication, "ROLE_DRIVER")) {
            Long currentDriverId = currentDriverId(authentication);
            if (currentDriverId == null || !currentDriverId.equals(driver.getId())) {
                return forbidden("Solo puedes aceptar pedidos con tu propio perfil.");
            }
        } else if (!ownsOrderRestaurant(order, authentication)) {
            return forbidden("Este pedido no pertenece a tu restaurante.");
        }

        order.setDriverId(driver.getId());
        order.setDriverName(driver.getName());
        return ResponseEntity.ok(OrderResponse.from(orderRepository.save(order), true));
    }

    private boolean ownsOrderRestaurant(Order order, Authentication authentication) {
        if (!hasAuthority(authentication, "ROLE_RESTAURANT")) return false;
        return restaurantRepository.findByUserId(principal(authentication).getId())
                .map(restaurant -> restaurant.getId().equals(order.getRestaurantId()))
                .orElse(false);
    }

    private List<OrderResponse> toResponses(List<Order> orders, boolean includePersonalData) {
        return orders.stream().map(order -> OrderResponse.from(order, includePersonalData)).toList();
    }

    private UserDetailsImpl principal(Authentication authentication) {
        return (UserDetailsImpl) authentication.getPrincipal();
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication.getAuthorities().stream()
                .anyMatch(candidate -> candidate.getAuthority().equals(authority));
    }

    private Long currentDriverId(Authentication authentication) {
        return driverRepository.findByUserId(principal(authentication).getId())
                .map(Driver::getId)
                .orElse(null);
    }

    private Long parsePositiveLong(Object value) {
        if (value == null) return null;
        try {
            long parsed = Long.parseLong(value.toString());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    private ResponseEntity<Map<String, String>> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", message));
    }

    private double calculateDistanceKm(Coordinates origin, Coordinates destination) {
        if (origin == null || destination == null || origin.getLat() == null || origin.getLng() == null
                || destination.getLat() == null || destination.getLng() == null) {
            return 0;
        }
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
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private int defaultValue(Integer value) {
        return value == null ? 0 : value;
    }

    private double defaultValue(Double value) {
        return value == null ? 0 : value;
    }
}
