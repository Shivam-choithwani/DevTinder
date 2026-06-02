package com.devtinder.core.controller;

import com.devtinder.core.model.Project;
import com.devtinder.core.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    // POST /api/projects -> Add a new project to the user's portfolio
    @PostMapping
    public ResponseEntity<Project> addProject(@RequestBody Project project) {
        Project savedProject = projectService.addPortfolioProject(project);
        return ResponseEntity.ok(savedProject);
    }

    // GET /api/projects/owner/{ownerId} -> Get all projects for a user's profile
    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<List<Project>> getOwnerProjects(@PathVariable String ownerId) {
        List<Project> projects = projectService.getProjectsByOwner(ownerId);
        return ResponseEntity.ok(projects);
    }
}
