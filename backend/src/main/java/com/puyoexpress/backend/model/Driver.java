package com.puyoexpress.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.puyoexpress.backend.security.SensitiveStringConverter;
import jakarta.persistence.*;

@Entity
@Table(name = "drivers")
public class Driver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "user_id", unique = true)
    @JsonIgnore
    private User user;

    private String name;
    @Column(length = 512)
    @Convert(converter = SensitiveStringConverter.class)
    private String phone;
    private String zone;
    private String vehicle;
    private Double rating;
    private String status; // active, delivering, offline
    
    @Column(name = "total_earnings")
    private Double totalEarnings;
    
    @Column(name = "completed_deliveries")
    private Integer completedDeliveries;

    @Embedded
    private Coordinates position;

    public Driver() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    @JsonProperty("userId")
    public Long getUserId() { return user == null ? null : user.getId(); }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }

    public String getVehicle() { return vehicle; }
    public void setVehicle(String vehicle) { this.vehicle = vehicle; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getTotalEarnings() { return totalEarnings; }
    public void setTotalEarnings(Double totalEarnings) { this.totalEarnings = totalEarnings; }

    public Integer getCompletedDeliveries() { return completedDeliveries; }
    public void setCompletedDeliveries(Integer completedDeliveries) { this.completedDeliveries = completedDeliveries; }

    public Coordinates getPosition() { return position; }
    public void setPosition(Coordinates position) { this.position = position; }
}
