package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Driver;
import com.puyoexpress.backend.dto.DriverResponse;
import com.puyoexpress.backend.repository.DriverRepository;
import com.puyoexpress.backend.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    private final DriverRepository repository;

    public DriverController(DriverRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<DriverResponse> getAllDrivers(Authentication authentication) {
        Long currentUserId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        boolean isDriver = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_DRIVER"));
        boolean isRestaurant = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_RESTAURANT"));
        if (!isDriver && !isRestaurant) {
            return List.of();
        }
        return repository.findAll().stream()
                .filter(driver -> !isDriver
                        || (driver.getUserId() != null && driver.getUserId().equals(currentUserId)))
                .map(driver -> DriverResponse.from(driver,
                        isDriver && driver.getUserId() != null && driver.getUserId().equals(currentUserId)))
                .toList();
    }
    
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_DRIVER')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestBody Map<String, String> body,
                                          Authentication authentication) {
        return repository.findById(id).map(driver -> {
            Long currentUserId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
            if (driver.getUserId() == null || !driver.getUserId().equals(currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "No puedes modificar otro perfil de repartidor."));
            }
            String status = body.get("status");
            if (!"active".equals(status) && !"offline".equals(status)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Estado de repartidor no permitido."));
            }
            if ("delivering".equals(driver.getStatus())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No puedes desconectarte durante una entrega."));
            }
            driver.setStatus(status);
            repository.save(driver);
            return ResponseEntity.ok(driver);
        }).orElse(ResponseEntity.notFound().build());
    }
}
