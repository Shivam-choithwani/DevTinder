package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "connections")
public class Connection {

    @Id
    private String id;

    // The two users who matched with each other!
    private String userOneId;
    private String userTwoId;

    private LocalDateTime createdAt;
}
