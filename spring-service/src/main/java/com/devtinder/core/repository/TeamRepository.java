package com.devtinder.core.repository;

import com.devtinder.core.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TeamRepository extends MongoRepository<Team, String> {
    // Find all teams created by a specific user
    List<Team> findByAdminUserId(String adminUserId);

    // Find all teams that belong to a specific project
    List<Team> findByProjectId(String projectId);
}
