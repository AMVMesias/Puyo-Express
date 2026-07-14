package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Driver;
import com.puyoexpress.backend.repository.DriverRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public List<Driver> getAllDrivers() {
        return repository.findAll();
    }
    
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_DRIVER')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return repository.findById(id).map(driver -> {
            driver.setStatus(body.get("status"));
            repository.save(driver);
            return ResponseEntity.ok(driver);
        }).orElse(ResponseEntity.notFound().build());
    }
}
