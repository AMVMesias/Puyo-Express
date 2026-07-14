package com.puyoexpress.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "landmarks")
public class Landmark {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type; // hotel, tourist_spot, restaurant, terminal
    private String description;

    @Embedded
    private Coordinates position;

    public Landmark() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Coordinates getPosition() { return position; }
    public void setPosition(Coordinates position) { this.position = position; }
}
