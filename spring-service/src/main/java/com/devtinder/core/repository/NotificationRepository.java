package com.devtinder.core.repository;

import com.devtinder.core.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    // Find all notifications for a specific user, sorted by newest first
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);

    // Find only the unread notifications for a user
    List<Notification> findByRecipientUserIdAndIsReadFalse(String recipientUserId);
}
