package com.puyoexpress.backend.service;

import com.puyoexpress.backend.model.Coordinates;
import com.puyoexpress.backend.model.ERole;
import com.puyoexpress.backend.model.Landmark;
import com.puyoexpress.backend.model.MenuItem;
import com.puyoexpress.backend.model.Restaurant;
import com.puyoexpress.backend.model.User;
import com.puyoexpress.backend.repository.LandmarkRepository;
import com.puyoexpress.backend.repository.MenuItemRepository;
import com.puyoexpress.backend.repository.RestaurantRepository;
import com.puyoexpress.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.bootstrap.restaurant-owner.enabled", havingValue = "true")
public class RestaurantOwnerBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;
    private final MenuItemRepository menuItemRepository;
    private final LandmarkRepository landmarkRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.restaurant-owner.username}")
    private String username;

    @Value("${app.bootstrap.restaurant-owner.email}")
    private String email;

    @Value("${app.bootstrap.restaurant-owner.password}")
    private String password;

    @Value("${app.bootstrap.restaurant-owner.restaurant-name}")
    private String restaurantName;

    public RestaurantOwnerBootstrap(UserRepository userRepository,
                                    RestaurantRepository restaurantRepository,
                                    MenuItemRepository menuItemRepository,
                                    LandmarkRepository landmarkRepository,
                                    PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.menuItemRepository = menuItemRepository;
        this.landmarkRepository = landmarkRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        validateConfiguration();

        String normalizedUsername = username.trim();
        String normalizedEmail = email.trim().toLowerCase();
        User owner = userRepository.findByUsername(normalizedUsername).orElse(null);

        if (owner == null) {
            owner = new User(
                    normalizedUsername,
                    normalizedEmail,
                    passwordEncoder.encode(password),
                    ERole.ROLE_RESTAURANT
            );
            owner = userRepository.save(owner);
        } else {
            if (owner.getRole() != ERole.ROLE_RESTAURANT) {
                throw new IllegalStateException(
                        "BOOTSTRAP_RESTAURANT_USERNAME pertenece a una cuenta que no es restaurante."
                );
            }
            owner.setEmail(normalizedEmail);
            owner.setPassword(passwordEncoder.encode(password));
            owner = userRepository.save(owner);
        }

        Restaurant restaurant = restaurantRepository.findByUserId(owner.getId()).orElse(null);
        if (restaurant == null) {
            restaurant = new Restaurant();
            restaurant.setUser(owner);
            restaurant.setName(InputPolicy.normalizeHumanText(restaurantName));
            restaurant.setDescription("Restaurante administrado por la cuenta local de Puyo Express.");
            restaurant.setCategory("Comida local");
            restaurant.setLogo("🍽️");
            restaurant.setLocationName("Puyo");
            restaurant.setRating(5.0);
            restaurant.setPosition(new Coordinates(-1.488333, -77.994444));
            restaurant = restaurantRepository.save(restaurant);
        }

        seedLocalCatalog(restaurant);
    }

    private void seedLocalCatalog(Restaurant restaurant) {
        if (!menuItemRepository.existsByRestaurantIdAndName(restaurant.getId(), "Maito de tilapia")) {
            MenuItem item = new MenuItem();
            item.setRestaurant(restaurant);
            item.setName("Maito de tilapia");
            item.setDescription("Plato local de tilapia preparado en hoja.");
            item.setPrice(8.50);
            item.setCategory("Platos fuertes");
            item.setImage("🐟");
            menuItemRepository.save(item);
        }

        if (landmarkRepository.findByName("Parque Central de Puyo").isEmpty()) {
            Landmark landmark = new Landmark();
            landmark.setName("Parque Central de Puyo");
            landmark.setType("tourist_spot");
            landmark.setDescription("Punto de entrega local para pruebas y operación inicial.");
            landmark.setPosition(new Coordinates(-1.486667, -77.995833));
            landmarkRepository.save(landmark);
        }
    }

    private void validateConfiguration() {
        if (username == null || !username.matches("^[\\p{L}][\\p{L}\\p{N}._-]{2,49}$")) {
            throw new IllegalStateException("BOOTSTRAP_RESTAURANT_USERNAME no es válido.");
        }
        if (email == null || email.isBlank() || email.length() > 100 || !email.contains("@")) {
            throw new IllegalStateException("BOOTSTRAP_RESTAURANT_EMAIL no es válido.");
        }
        if (password == null || password.length() < 12 || password.length() > 120) {
            throw new IllegalStateException(
                    "El secreto restaurant_owner_password debe tener entre 12 y 120 caracteres."
            );
        }
        if (restaurantName == null || restaurantName.isBlank() || restaurantName.length() > 100
                || InputPolicy.containsUnsafeControlCharacters(restaurantName)) {
            throw new IllegalStateException("BOOTSTRAP_RESTAURANT_NAME no es válido.");
        }
    }
}
