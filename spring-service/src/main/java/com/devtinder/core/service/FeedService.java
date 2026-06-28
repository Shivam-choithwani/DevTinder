package com.devtinder.core.service;

import com.devtinder.core.model.Profile;
import com.devtinder.core.model.Swipe;
import com.devtinder.core.repository.ProfileRepository;
import com.devtinder.core.repository.SwipeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedService {

    @Autowired
    private SwipeRepository swipeRepository;

    @Autowired
    private ProfileRepository profileRepository;

    /**
     * Retrieves potential candidate profiles for the feed.
     * Excludes:
     * 1. The current logged-in user
     * 2. Any users the current user has already swiped on (liked or passed)
     */
    public List<Profile> getFeed(String currentUserId) {
        // 1. Fetch all swipes the current user has performed
        List<Swipe> userSwipes = swipeRepository.findBySwiperUserId(currentUserId);

        // 2. Gather all target user IDs that have already been swiped
        List<String> excludedUserIds = userSwipes.stream()
                .map(Swipe::getTargetUserId)
                .collect(Collectors.toList());

        // 3. Always exclude the current user from their own feed
        excludedUserIds.add(currentUserId);

        try {
            // Attempt to call the FastAPI AI Recommendation service
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "http://localhost:8000/recommender/feed";

            java.util.Map<String, Object> request = new java.util.HashMap<>();
            request.put("userId", currentUserId);
            request.put("limit", 20);

            // Set reasonable connection and read timeouts (e.g. 2.5 seconds)
            org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = 
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(2500);
            requestFactory.setReadTimeout(2500);
            restTemplate.setRequestFactory(requestFactory);

            List<?> responseList = restTemplate.postForObject(url, request, List.class);
            if (responseList != null && !responseList.isEmpty()) {
                List<Profile> rankedProfiles = new ArrayList<>();
                for (Object item : responseList) {
                    if (item instanceof java.util.Map) {
                        java.util.Map<?, ?> map = (java.util.Map<?, ?>) item;
                        String targetUserId = (String) map.get("userId");
                        if (targetUserId != null) {
                            java.util.Optional<Profile> op = profileRepository.findByUserId(targetUserId);
                            if (op.isPresent()) {
                                Profile profile = op.get();
                                // Parse and set transient compatibility details from AI service
                                Object scoreObj = map.get("compatibilityScore");
                                if (scoreObj instanceof Number) {
                                    profile.setCompatibilityScore(((Number) scoreObj).doubleValue());
                                }
                                Object reasonObj = map.get("compatibilityReason");
                                if (reasonObj instanceof String) {
                                    profile.setCompatibilityReason((String) reasonObj);
                                }
                                rankedProfiles.add(profile);
                            }
                        }
                    }
                }
                if (!rankedProfiles.isEmpty()) {
                    System.out.println("Enriched feed with " + rankedProfiles.size() + " profiles using FastAPI AI Service.");
                    return rankedProfiles;
                }
            }
        } catch (Exception e) {
            System.err.println("FastAPI AI Recommendation Service failed or unreachable: " + e.getMessage() + ". Falling back to DB-based feed.");
        }

        // Fallback: Retrieve candidate profiles directly from MongoDB in default order
        return profileRepository.findByUserIdNotIn(excludedUserIds);
    }
}
