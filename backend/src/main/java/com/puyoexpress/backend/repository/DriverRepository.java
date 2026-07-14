package com.puyoexpress.backend.repository;

import com.puyoexpress.backend.model.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    @Query("select driver from Driver driver where driver.user.id = :userId")
    Optional<Driver> findByUserId(@Param("userId") Long userId);
}
