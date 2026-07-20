package com.puyoexpress.backend.repository;

import com.puyoexpress.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {"items", "items.item"})
    List<Order> findByRestaurantId(Long restaurantId);

    @EntityGraph(attributePaths = {"items", "items.item"})
    List<Order> findByDriverId(Long driverId);

    @EntityGraph(attributePaths = {"items", "items.item"})
    List<Order> findByCustomerId(Long customerId);

    @EntityGraph(attributePaths = {"items", "items.item"})
    List<Order> findByStatusAndDriverIdIsNull(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"items", "items.item"})
    @Query("select order from Order order where order.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
}
