package com.devtinder.core.controller;

import com.devtinder.core.model.Profile;
import com.devtinder.core.service.ProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*") // Allows your React frontend to talk to this API
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    // 1. ENDPOINT: React sends a POST request here to create/update a profile
    @PostMapping
    public ResponseEntity<Profile> createOrUpdateProfile(@RequestBody Profile profile) {
        Profile savedProfile = profileService.saveProfile(profile);
        return ResponseEntity.ok(savedProfile);
    }

    // 2. ENDPOINT: React sends a GET request here to load a specific user's profile
    @GetMapping("/{userId}")
    public ResponseEntity<Profile> getProfile(@PathVariable String userId) {
        Optional<Profile> profile = profileService.getProfileByUserId(userId);

        if (profile.isPresent()) {
            return ResponseEntity.ok(profile.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
