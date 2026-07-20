package com.puyoexpress.backend.service;

import com.puyoexpress.backend.dto.AuthResponse;
import com.puyoexpress.backend.dto.LoginRequest;
import com.puyoexpress.backend.dto.RegisterRequest;
import com.puyoexpress.backend.model.ERole;
import com.puyoexpress.backend.model.Coordinates;
import com.puyoexpress.backend.model.Driver;
import com.puyoexpress.backend.model.User;
import com.puyoexpress.backend.repository.DriverRepository;
import com.puyoexpress.backend.repository.UserRepository;
import com.puyoexpress.backend.security.JwtUtils;
import com.puyoexpress.backend.security.UserDetailsImpl;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service handling user authentication (login) and registration.
 */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       DriverRepository driverRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtils jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    /**
     * Authenticates a user and returns their info + a JWT cookie.
     */
    public record LoginResult(AuthResponse response, ResponseCookie cookie) {}

    public LoginResult login(LoginRequest request) {
        String usernameOrEmail = request.getUsername().trim();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        usernameOrEmail,
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String role = userDetails.getAuthorities().iterator().next().getAuthority();
        ResponseCookie cookie = jwtUtils.generateJwtCookie(userDetails.getUsername(), role);

        AuthResponse response = new AuthResponse(
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                role
        );

        return new LoginResult(response, cookie);
    }

    /**
     * Registers a new user after validating uniqueness and encoding the password.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = InputPolicy.normalizeHumanText(request.getUsername());
        String email = request.getEmail().trim().toLowerCase();

        if (InputPolicy.containsUnsafeControlCharacters(username)
                || InputPolicy.containsUnsafeControlCharacters(email)) {
            throw new IllegalArgumentException("Los datos contienen caracteres no permitidos.");
        }

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El nombre de usuario ya está en uso.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("El correo electrónico ya está registrado.");
        }

        ERole role;
        try {
            String normalizedRole = request.getRole().trim().toUpperCase();
            if (!normalizedRole.startsWith("ROLE_")) {
                normalizedRole = "ROLE_" + normalizedRole;
            }
            role = ERole.valueOf(normalizedRole);
            if (role != ERole.ROLE_CUSTOMER && role != ERole.ROLE_DRIVER) {
                throw new IllegalArgumentException("El registro público solo permite cuentas de cliente o repartidor.");
            }
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("El registro público solo permite")) {
                throw e;
            }
            throw new IllegalArgumentException(
                    "Rol inválido. Usa CUSTOMER o DRIVER."
            );
        }

        User user = new User(
                username,
                email,
                passwordEncoder.encode(request.getPassword()),
                role
        );

        User savedUser = userRepository.save(user);

        if (role == ERole.ROLE_DRIVER) {
            Driver driver = new Driver();
            driver.setUser(savedUser);
            driver.setName(savedUser.getUsername());
            driver.setZone("Puyo");
            driver.setVehicle("moto");
            driver.setRating(5.0);
            driver.setStatus("offline");
            driver.setTotalEarnings(0.0);
            driver.setCompletedDeliveries(0);
            driver.setPosition(new Coordinates(-1.488333, -77.994444));
            driverRepository.save(driver);
        }

        return new AuthResponse(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole().name()
        );
    }

    /**
     * Generates a clean (empty) JWT cookie for logout.
     */
    public ResponseCookie logout() {
        return jwtUtils.generateCleanJwtCookie();
    }
}
