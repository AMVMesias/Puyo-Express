package com.puyoexpress.backend.config;

import com.puyoexpress.backend.model.ERole;
import com.puyoexpress.backend.model.User;
import com.puyoexpress.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the database with default test users on first startup.
 * Only creates users if they don't already exist (safe to re-run).
 *
 * Default test accounts:
 * - cliente@puyoexpress.local / Cliente2026!  (ROLE_CUSTOMER)
 * - restaurante@puyoexpress.local / Restaurante2026!  (ROLE_RESTAURANT)
 * - repartidor@puyoexpress.local / Repartidor2026!  (ROLE_DRIVER)
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createUserIfNotExists("cliente", "cliente@puyoexpress.local", "Cliente2026!", ERole.ROLE_CUSTOMER);
        createUserIfNotExists("restaurante", "restaurante@puyoexpress.local", "Restaurante2026!", ERole.ROLE_RESTAURANT);
        createUserIfNotExists("repartidor", "repartidor@puyoexpress.local", "Repartidor2026!", ERole.ROLE_DRIVER);

        logger.info("✅ Data initialization complete. {} users in database.", userRepository.count());
    }

    private void createUserIfNotExists(String username, String email, String rawPassword, ERole role) {
        if (userRepository.existsByUsername(username)) {
            logger.info("User '{}' already exists, skipping.", username);
            return;
        }

        User user = new User(
                username,
                email,
                passwordEncoder.encode(rawPassword),
                role
        );

        userRepository.save(user);
        logger.info("Created default user: {} ({})", username, role);
    }
}
