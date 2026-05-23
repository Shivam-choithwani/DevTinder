package com.devtinder.core.service;

import com.devtinder.core.model.Project;
import com.devtinder.core.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    // Add a portfolio project
    public Project addPortfolioProject(Project project) {
        return projectRepository.save(project);
    }

    // Get all portfolio projects for a specific user
    public List<Project> getProjectsByOwner(String ownerUserId) {
        return projectRepository.findByOwnerUserId(ownerUserId);
    }
}
