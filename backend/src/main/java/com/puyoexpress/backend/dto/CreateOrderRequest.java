package com.puyoexpress.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreateOrderRequest {

    @NotNull(message = "El restaurante es obligatorio.")
    @Positive(message = "El restaurante no es válido.")
    private Long restaurantId;

    @NotBlank(message = "El nombre es obligatorio.")
    @Size(min = 2, max = 80, message = "El nombre debe tener entre 2 y 80 caracteres.")
    @Pattern(
            regexp = "^(?=.*\\p{L})[\\p{L}\\p{M} .,'’\\-]+$",
            message = "El nombre contiene caracteres no permitidos o no contiene letras."
    )
    private String customerName;

    @NotBlank(message = "El teléfono es obligatorio.")
    @Pattern(
            regexp = "^\\+?[0-9]{7,15}$",
            message = "El teléfono debe contener entre 7 y 15 dígitos."
    )
    private String customerPhone;

    @NotBlank(message = "La dirección es obligatoria.")
    @Size(min = 5, max = 300, message = "La dirección debe tener entre 5 y 300 caracteres.")
    private String deliveryAddress;

    @NotNull(message = "El punto de entrega es obligatorio.")
    @Positive(message = "El punto de entrega no es válido.")
    private Long deliveryLandmarkId;

    @NotEmpty(message = "El pedido debe contener al menos un producto.")
    @Size(max = 50, message = "El pedido no puede contener más de 50 productos distintos.")
    private List<@Valid CreateOrderItemRequest> items;

    public Long getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(Long restaurantId) {
        this.restaurantId = restaurantId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }

    public Long getDeliveryLandmarkId() {
        return deliveryLandmarkId;
    }

    public void setDeliveryLandmarkId(Long deliveryLandmarkId) {
        this.deliveryLandmarkId = deliveryLandmarkId;
    }

    public List<CreateOrderItemRequest> getItems() {
        return items;
    }

    public void setItems(List<CreateOrderItemRequest> items) {
        this.items = items;
    }
}
