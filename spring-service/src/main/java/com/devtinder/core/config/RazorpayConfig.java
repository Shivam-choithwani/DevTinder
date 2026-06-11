package com.devtinder.core.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
        // If keys aren't set yet, return null so Spring Boot can still start up locally for testing.
        if (keyId == null || keyId.trim().isEmpty() || keySecret == null || keySecret.trim().isEmpty()) {
            System.out.println("⚠️ Razorpay Key ID or Secret is not configured. Payments will fail.");
            return null;
        }
        return new RazorpayClient(keyId, keySecret);
    }
}
