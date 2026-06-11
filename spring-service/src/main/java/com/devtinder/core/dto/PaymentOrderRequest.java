package com.devtinder.core.dto;

import lombok.Data;

@Data
public class PaymentOrderRequest {
    // Amount in Rupees (e.g. 299 or 499)
    private double amount;
}
