package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "projects")
public class Project {

    @Id
    private String id;

    private String ownerUserId;

    private String title;
    private String description;

    private List<String> requiredSkills;

    private ProjectStatus status;
    private LocalDateTime postedAt = LocalDateTime.now();

    public enum ProjectStatus { OPEN, IN_PROGRESS, COMPLETED }
}
