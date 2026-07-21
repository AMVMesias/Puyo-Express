package com.puyoexpress.backend.service;

import com.puyoexpress.backend.model.ERole;
import com.puyoexpress.backend.model.Landmark;
import com.puyoexpress.backend.model.MenuItem;
import com.puyoexpress.backend.model.Restaurant;
import com.puyoexpress.backend.model.User;
import com.puyoexpress.backend.repository.LandmarkRepository;
import com.puyoexpress.backend.repository.MenuItemRepository;
import com.puyoexpress.backend.repository.RestaurantRepository;
import com.puyoexpress.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RestaurantOwnerBootstrapTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RestaurantRepository restaurantRepository;
    @Mock
    private MenuItemRepository menuItemRepository;
    @Mock
    private LandmarkRepository landmarkRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private ApplicationArguments arguments;
    @Mock
    private User owner;

    private RestaurantOwnerBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        bootstrap = new RestaurantOwnerBootstrap(
                userRepository,
                restaurantRepository,
                menuItemRepository,
                landmarkRepository,
                passwordEncoder
        );
        ReflectionTestUtils.setField(bootstrap, "username", "restaurante");
        ReflectionTestUtils.setField(bootstrap, "email", "restaurante@puyoexpress.local");
        ReflectionTestUtils.setField(bootstrap, "password", "Clave-Segura-Local-2026");
        ReflectionTestUtils.setField(bootstrap, "restaurantName", "Restaurante Puyo Express");

        Restaurant restaurant = new Restaurant();
        restaurant.setId(1L);

        when(userRepository.findByUsername("restaurante")).thenReturn(Optional.of(owner));
        when(owner.getRole()).thenReturn(ERole.ROLE_RESTAURANT);
        when(owner.getId()).thenReturn(1L);
        when(userRepository.save(owner)).thenReturn(owner);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-password");
        when(restaurantRepository.findByUserId(1L)).thenReturn(Optional.of(restaurant));
        when(landmarkRepository.findByName("Parque Central de Puyo"))
                .thenReturn(Optional.of(new Landmark()));
    }

    @Test
    void seedsEightMenuItemsWhenCatalogIsEmpty() throws Exception {
        when(menuItemRepository.existsByRestaurantIdAndName(anyLong(), anyString())).thenReturn(false);

        bootstrap.run(arguments);

        ArgumentCaptor<MenuItem> captor = ArgumentCaptor.forClass(MenuItem.class);
        verify(menuItemRepository, org.mockito.Mockito.times(8)).save(captor.capture());
        List<String> names = captor.getAllValues().stream().map(MenuItem::getName).toList();
        assertEquals(List.of(
                "Maito de tilapia",
                "Encebollado",
                "Ceviche de camarón",
                "Tilapia frita",
                "Seco de pollo",
                "Chontacuro asado",
                "Té de guayusa",
                "Jugo natural"
        ), names);
    }

    @Test
    void doesNotDuplicateExistingMenuItems() throws Exception {
        when(menuItemRepository.existsByRestaurantIdAndName(anyLong(), anyString())).thenReturn(true);

        bootstrap.run(arguments);

        verify(menuItemRepository, never()).save(any(MenuItem.class));
    }
}
