package com.devtinder.core.controller;

import com.devtinder.core.dto.PaymentOrderRequest;
import com.devtinder.core.dto.PaymentVerificationRequest;
import com.devtinder.core.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    /**
     * Endpoint to create an order on Razorpay servers
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody PaymentOrderRequest request) {
        try {
            Map<String, Object> orderDetails = paymentService.createOrder(request);
            return ResponseEntity.ok(orderDetails);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    /**
     * Endpoint to verify Razorpay payment signature and upgrade user to PRO
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        try {
            boolean success = paymentService.verifyPaymentAndUpgradeUser(request);
            if (success) {
                Map<String, String> response = new HashMap<>();
                response.put("status", "SUCCESS");
                response.put("message", "Payment verified. User account upgraded to PRO successfully!");
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Invalid payment signature. Verification failed.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Payment verification failed: " + e.getMessage());
        }
    }
}
