package com.puyoexpress.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "restaurants")
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    @JsonIgnore
    private User user;

    private String name;
    private String description;
    private String category;
    private String logo;
    private String banner;
    private Double rating;
    private String locationName;

    @Embedded
    private Coordinates position;

    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MenuItem> menu = new ArrayList<>();

    public Restaurant() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getLogo() { return logo; }
    public void setLogo(String logo) { this.logo = logo; }

    public String getBanner() { return banner; }
    public void setBanner(String banner) { this.banner = banner; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public Coordinates getPosition() { return position; }
    public void setPosition(Coordinates position) { this.position = position; }

    public List<MenuItem> getMenu() { return menu; }
    public void setMenu(List<MenuItem> menu) { this.menu = menu; }

    public void addMenuItem(MenuItem item) {
        menu.add(item);
        item.setRestaurant(this);
    }

    public void removeMenuItem(MenuItem item) {
        menu.remove(item);
        item.setRestaurant(null);
    }
}
