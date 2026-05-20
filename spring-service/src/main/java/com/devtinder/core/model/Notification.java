package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "notifications")
public class Notification {
    @Id
    private String id;

    // The user who receives the notification
    private String recipientUserId;

    private String message;

    // e.g., "NEW_MATCH", "TEAM_INVITE", "SYSTEM_ALERT"
    private NotificationType type;

    // True if they clicked/saw it
    private boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum NotificationType { NEW_MATCH, TEAM_INVITE, SYSTEM_ALERT }
}
