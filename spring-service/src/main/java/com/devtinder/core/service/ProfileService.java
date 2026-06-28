package com.devtinder.core.service;

import com.devtinder.core.model.Profile;
import com.devtinder.core.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ProfileService {

    @Autowired
    private ProfileRepository profileRepository;

    // Create or Update a Profile
    public Profile saveProfile(Profile profile) {
        Profile savedProfile = profileRepository.save(profile);
        
        // Trigger FastAPI AI builder profile generation asynchronously in background
        if (savedProfile.getGithubUrl() != null && !savedProfile.getGithubUrl().trim().isEmpty()) {
            String userId = savedProfile.getUserId();
            new Thread(() -> {
                try {
                    // Small delay to ensure DB write is visible
                    Thread.sleep(500); 
                    
                    org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                    String url = "http://localhost:8000/profile/generate/" + userId;
                    
                    java.util.Map<String, Object> intent = new java.util.HashMap<>();
                    intent.put("whatToBuild", "Software projects and tech solutions");
                    intent.put("lookingFor", java.util.Arrays.asList("Developers", "Collaborators"));
                    intent.put("commitment", "Part Time");
                    intent.put("startupStage", "Idea");
                    
                    restTemplate.postForObject(url, intent, String.class);
                    System.out.println("Asynchronously triggered builder profile generation for user: " + userId);
                } catch (Exception e) {
                    System.err.println("Failed to trigger FastAPI builder profile generation: " + e.getMessage());
                }
            }).start();
        }
        
        return savedProfile;
    }

    // Get a Profile by the User's ID
    public Optional<Profile> getProfileByUserId(String userId) {
        return profileRepository.findByUserId(userId);
    }
}
