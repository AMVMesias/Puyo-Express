package com.puyoexpress.backend.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CreateOrderRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsNumericOnlyCustomerName() {
        CreateOrderRequest request = validRequest();
        request.setCustomerName("999999999999");

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsExtremeQuantity() {
        CreateOrderRequest request = validRequest();
        request.getItems().getFirst().setQuantity(Integer.MAX_VALUE);

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void acceptsNormalOrderInput() {
        assertTrue(validator.validate(validRequest()).isEmpty());
    }

    private CreateOrderRequest validRequest() {
        CreateOrderItemRequest item = new CreateOrderItemRequest();
        item.setMenuItemId(1L);
        item.setQuantity(2);

        CreateOrderRequest request = new CreateOrderRequest();
        request.setRestaurantId(1L);
        request.setCustomerName("María Pérez");
        request.setCustomerPhone("+593981234567");
        request.setDeliveryAddress("Entrada principal del hotel");
        request.setDeliveryLandmarkId(1L);
        request.setItems(List.of(item));
        return request;
    }
}
