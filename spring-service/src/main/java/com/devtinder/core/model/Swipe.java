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
    private String swiperUserId;
    private String targetUserId;

    // True = Right Swipe (Like), False = Left Swipe (Pass)
    private boolean isRightSwipe;

    private LocalDateTime timestamp;
}
