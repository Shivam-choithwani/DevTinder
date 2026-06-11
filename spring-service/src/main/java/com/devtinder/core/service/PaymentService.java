package com.devtinder.core.service;

import com.devtinder.core.dto.PaymentOrderRequest;
import com.devtinder.core.dto.PaymentVerificationRequest;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.UserRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentService {

    @Autowired(required = false)
    private RazorpayClient razorpayClient;

    @Autowired
    private UserRepository userRepository;

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    public Map<String, Object> createOrder(PaymentOrderRequest request) throws Exception {
        if (razorpayClient == null) {
            throw new IllegalStateException("Razorpay client is not configured. Please check API keys.");
        }

        JSONObject orderRequest = new JSONObject();
        // Razorpay expects amount in paise (1 Rupee = 100 Paise)
        orderRequest.put("amount", (int) (request.getAmount() * 100));
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "txn_" + System.currentTimeMillis());

        Order order = razorpayClient.orders.create(orderRequest);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.get("id"));
        response.put("amount", order.get("amount"));
        response.put("currency", order.get("currency"));
        response.put("keyId", keyId);

        return response;
    }

    public boolean verifyPaymentAndUpgradeUser(PaymentVerificationRequest request) throws Exception {
        // 1. Prepare payment attributes to verify signature
        JSONObject options = new JSONObject();
        options.put("razorpay_order_id", request.getRazorpayOrderId());
        options.put("razorpay_payment_id", request.getRazorpayPaymentId());
        options.put("razorpay_signature", request.getRazorpaySignature());

        // 2. Verify payment signature
        boolean isValid = Utils.verifyPaymentSignature(options, keySecret);

        if (isValid) {
            // 3. Upgrade User to PRO tier on successful payment
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setSubscriptionTier(User.SubscriptionTier.PRO);
            userRepository.save(user);
            return true;
        }

        return false;
    }
}
