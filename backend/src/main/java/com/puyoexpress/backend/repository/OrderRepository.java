package com.puyoexpress.backend.repository;

import com.puyoexpress.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByRestaurantId(Long restaurantId);
    List<Order> findByDriverId(Long driverId);
    List<Order> findByCustomerName(String customerName);
}
