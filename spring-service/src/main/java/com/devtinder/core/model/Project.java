package com.devtinder.core.model;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "projects")
@Data
public class Project {

    @Id
    private String id;
    private String title;
    private String description;

    // Changed to reflect a portfolio piece
    private List<String> technologiesUsed;
    private String githubUrl;
    private String liveDemoUrl;

    private String ownerUserId;

}
