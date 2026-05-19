package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "swipes")
public class Swipe {

    @Id
    private String id;

    private String swiperUserId; // The person swiping
    private String targetUserId; // The person being swiped on

    private SwipeAction action;

    private LocalDateTime swipedAt = LocalDateTime.now();

    // LIKE = Swiped Right. PASS = Swiped Left.
    public enum SwipeAction { LIKE, PASS }
}
