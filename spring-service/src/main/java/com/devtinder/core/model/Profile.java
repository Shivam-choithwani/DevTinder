package com.devtinder.core.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "profiles")
public class Profile {

    @Id
    private String id;

    private String userId; // Links back to the User ID

    private String fullName;
    private String bio;
    private String githubUrl;
    private String resumeUrl;

    // The AI Recommendation engine will look at these arrays
    private List<String> skills;
    private List<String> interests;

    private int yearsOfExperience;
}
