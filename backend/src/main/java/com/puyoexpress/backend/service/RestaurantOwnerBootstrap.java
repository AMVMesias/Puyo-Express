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
        seedMenuItem(
                restaurant,
                "Maito de tilapia",
                "Tilapia sazonada con productos amazónicos y cocida en hoja.",
                8.50,
                "Platos fuertes",
                "🐟"
        );
        seedMenuItem(
                restaurant,
                "Encebollado",
                "Sopa de pescado con yuca, cebolla curtida y hierbas frescas.",
                4.50,
                "Sopas",
                "🍲"
        );
        seedMenuItem(
                restaurant,
                "Ceviche de camarón",
                "Camarones marinados con limón, tomate, cebolla y cilantro.",
                7.50,
                "Ceviches",
                "🍤"
        );
        seedMenuItem(
                restaurant,
                "Tilapia frita",
                "Tilapia entera acompañada de patacones, arroz y ensalada.",
                9.00,
                "Platos fuertes",
                "🐠"
        );
        seedMenuItem(
                restaurant,
                "Seco de pollo",
                "Pollo cocido en salsa de hierbas, servido con arroz y maduro.",
                6.50,
                "Platos fuertes",
                "🍗"
        );
        seedMenuItem(
                restaurant,
                "Chontacuro asado",
                "Preparación tradicional amazónica asada y acompañada con yuca.",
                5.00,
                "Comida amazónica",
                "🌿"
        );
        seedMenuItem(
                restaurant,
                "Té de guayusa",
                "Infusión amazónica de guayusa servida caliente o fría.",
                2.00,
                "Bebidas",
                "🍵"
        );
        seedMenuItem(
                restaurant,
                "Jugo natural",
                "Jugo preparado al momento con fruta disponible de temporada.",
                2.50,
                "Bebidas",
                "🥤"
        );

        if (landmarkRepository.findByName("Parque Central de Puyo").isEmpty()) {
            Landmark landmark = new Landmark();
            landmark.setName("Parque Central de Puyo");
            landmark.setType("tourist_spot");
            landmark.setDescription("Punto de entrega local para pruebas y operación inicial.");
            landmark.setPosition(new Coordinates(-1.486667, -77.995833));
            landmarkRepository.save(landmark);
        }
    }

    private void seedMenuItem(Restaurant restaurant,
                              String name,
                              String description,
                              double price,
                              String category,
                              String image) {
        if (menuItemRepository.existsByRestaurantIdAndName(restaurant.getId(), name)) {
            return;
        }

        MenuItem item = new MenuItem();
        item.setRestaurant(restaurant);
        item.setName(name);
        item.setDescription(description);
        item.setPrice(price);
        item.setCategory(category);
        item.setImage(image);
        menuItemRepository.save(item);
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
