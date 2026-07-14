package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Order;
import com.puyoexpress.backend.repository.OrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository repository;

    public OrderController(OrderRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Order> getAllOrders() {
        return repository.findAll();
    }
    
    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        order.setStatus("pending");
        order.setRouteProgress(0);
        return repository.save(order);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return repository.findById(id).map(order -> {
            order.setStatus(body.get("status"));
            repository.save(order);
            return ResponseEntity.ok(order);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/assign-driver")
    public ResponseEntity<?> assignDriver(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return repository.findById(id).map(order -> {
            order.setDriverId(Long.valueOf(body.get("driverId").toString()));
            if (body.containsKey("driverName")) {
                order.setDriverName((String) body.get("driverName"));
            }
            repository.save(order);
            return ResponseEntity.ok(order);
        }).orElse(ResponseEntity.notFound().build());
    }
}
