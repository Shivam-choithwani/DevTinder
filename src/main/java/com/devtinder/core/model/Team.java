package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "teams")
public class Team {
    @Id
    private String id;

    private String name;
    private String description;

    // The ID of the project they are working on
    private String projectId;

    // The person who formed the group
    private String adminUserId;

    // A list of User IDs of everyone in the group
    private List<String> memberUserIds;

    private LocalDateTime createdAt = LocalDateTime.now();
}
