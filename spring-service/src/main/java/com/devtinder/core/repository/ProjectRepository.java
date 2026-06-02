package com.devtinder.core.repository;

import com.devtinder.core.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    // Finds all portfolio projects belonging to a specific user
    List<Project> findByOwnerUserId(String ownerUserId);
}
