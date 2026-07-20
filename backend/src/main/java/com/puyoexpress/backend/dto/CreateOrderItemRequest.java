package com.puyoexpress.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class CreateOrderItemRequest {

    @NotNull(message = "El producto es obligatorio.")
    @Positive(message = "El producto no es válido.")
    private Long menuItemId;

    @NotNull(message = "La cantidad es obligatoria.")
    @Min(value = 1, message = "La cantidad mínima es 1.")
    @Max(value = 50, message = "La cantidad máxima por producto es 50.")
    private Integer quantity;

    public Long getMenuItemId() {
        return menuItemId;
    }

    public void setMenuItemId(Long menuItemId) {
        this.menuItemId = menuItemId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
