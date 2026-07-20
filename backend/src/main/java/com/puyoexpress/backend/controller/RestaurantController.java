package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Restaurant;
import com.puyoexpress.backend.repository.RestaurantRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.puyoexpress.backend.security.UserDetailsImpl;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantRepository repository;

    public RestaurantController(RestaurantRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<?> getAllRestaurants(Authentication authentication) {
        boolean isRestaurant = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_RESTAURANT"));
        if (isRestaurant) {
            Long userId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
            return repository.findByUserId(userId)
                    .<ResponseEntity<?>>map(restaurant -> ResponseEntity.ok(List.of(restaurant)))
                    .orElseGet(() -> ResponseEntity.status(403)
                            .body(java.util.Map.of("error", "Tu cuenta no tiene un restaurante asociado.")));
        }
        return ResponseEntity.ok(repository.findAllByOrderByIdAsc());
    }
}
