package com.devtinder.core.controller;

import com.devtinder.core.model.Profile;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.UserRepository;
import com.devtinder.core.service.FeedService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/feed")
@CrossOrigin(origins = "*")
public class FeedController {

    @Autowired
    private FeedService feedService;

    @Autowired
    private UserRepository userRepository;

    // GET /api/feed -> Returns all candidate profiles for the authenticated user
    @GetMapping
    public ResponseEntity<?> getUserFeed(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        // Fetch user from database using email in JWT Subject principal
        String email = principal.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged-in user details not found"));

        List<Profile> feed = feedService.getFeed(currentUser.getId());
        return ResponseEntity.ok(feed);
    }
}
