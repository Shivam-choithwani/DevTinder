package com.devtinder.core.controller;

import com.devtinder.core.model.Connection;
import com.devtinder.core.model.Profile;
import com.devtinder.core.model.Swipe;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.ConnectionRepository;
import com.devtinder.core.repository.ProfileRepository;
import com.devtinder.core.repository.SwipeRepository;
import com.devtinder.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ConnectionController {

    @Autowired
    private ConnectionRepository connectionRepository;

    @Autowired
    private SwipeRepository swipeRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private UserRepository userRepository;

    // GET /api/connections -> Returns all matched developer profiles
    @GetMapping("/connections")
    public ResponseEntity<?> getConnections(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String email = principal.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged-in user details not found"));

        String currentUserId = currentUser.getId();

        List<Connection> connections = connectionRepository.findByUserOneIdOrUserTwoId(currentUserId, currentUserId);
        List<Profile> matchedProfiles = new ArrayList<>();

        for (Connection c : connections) {
            String otherUserId = c.getUserOneId().equals(currentUserId) ? c.getUserTwoId() : c.getUserOneId();
            profileRepository.findByUserId(otherUserId).ifPresent(p -> {
                p.setConnectionId(c.getId());
                p.setMatchedAt(c.getCreatedAt());
                matchedProfiles.add(p);
            });
        }

        return ResponseEntity.ok(matchedProfiles);
    }

    // GET /api/requests -> Returns profiles of users who liked the current user (but haven't been swiped on yet)
    @GetMapping("/requests")
    public ResponseEntity<?> getRequests(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String email = principal.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged-in user details not found"));

        String currentUserId = currentUser.getId();

        // 1. Get all swipes performed by the current user (already liked/passed)
        List<Swipe> userSwipes = swipeRepository.findBySwiperUserId(currentUserId);
        List<String> swipedTargetUserIds = userSwipes.stream()
                .map(Swipe::getTargetUserId)
                .collect(Collectors.toList());

        // 2. Get all incoming swipes (targetUserId = currentUserId) that are LIKES (isRightSwipe = true)
        List<Swipe> incomingLikes = swipeRepository.findByTargetUserIdAndIsRightSwipe(currentUserId, true);
        List<Profile> pendingProfiles = new ArrayList<>();

        for (Swipe like : incomingLikes) {
            // Only show if the current user has not swiped on this user yet
            if (!swipedTargetUserIds.contains(like.getSwiperUserId())) {
                profileRepository.findByUserId(like.getSwiperUserId()).ifPresent(p -> {
                    p.setSwipeId(like.getId());
                    p.setTimestamp(like.getTimestamp());
                    pendingProfiles.add(p);
                });
            }
        }

        return ResponseEntity.ok(pendingProfiles);
    }
}
