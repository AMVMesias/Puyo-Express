package com.puyoexpress.backend.repository;

import com.puyoexpress.backend.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    @EntityGraph(attributePaths = "menu")
    Optional<Restaurant> findByUserId(Long userId);

    @EntityGraph(attributePaths = "menu")
    List<Restaurant> findAllByOrderByIdAsc();
}
