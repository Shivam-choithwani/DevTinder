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

    // We store both user IDs in the same connection
    private String userOneId;
    private String userTwoId;

    private LocalDateTime matchedAt = LocalDateTime.now();
}
