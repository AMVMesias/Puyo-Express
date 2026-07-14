package com.puyoexpress.backend.controller;

import com.puyoexpress.backend.model.Landmark;
import com.puyoexpress.backend.repository.LandmarkRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/landmarks")
public class LandmarkController {

    private final LandmarkRepository repository;

    public LandmarkController(LandmarkRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Landmark> getAllLandmarks() {
        return repository.findAll();
    }
}
