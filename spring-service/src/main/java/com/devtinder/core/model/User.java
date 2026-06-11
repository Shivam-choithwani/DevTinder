package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String email;
    private String password;
    private String username;

    private Role role;
    private SubscriptionTier subscriptionTier;


    private int dailySwipeCount = 0;
    private LocalDate lastSwipeDate;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Role { USER, ADMIN }
    public enum SubscriptionTier { FREE, PRO }
}
