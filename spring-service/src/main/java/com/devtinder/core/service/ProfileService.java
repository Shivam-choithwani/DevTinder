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
        // Here you could add complex logic, like validating github URLs!
        return profileRepository.save(profile);
    }

    // Get a Profile by the User's ID
    public Optional<Profile> getProfileByUserId(String userId) {
        return profileRepository.findByUserId(userId);
    }
}
