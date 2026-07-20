package com.puyoexpress.backend.repository;

import com.puyoexpress.backend.model.Landmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LandmarkRepository extends JpaRepository<Landmark, Long> {
    Optional<Landmark> findByName(String name);
}
