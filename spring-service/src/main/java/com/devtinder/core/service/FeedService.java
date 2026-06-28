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

        // 4. Retrieve candidate profiles not in the excluded list
        List<Profile> candidates = profileRepository.findByUserIdNotIn(excludedUserIds);

        // 5. Hook for the AI/ML Developer to apply filtering/ranking models
        List<Profile> filteredAndRankedCandidates = applyMLRecommendationModels(candidates, currentUserId);

        return filteredAndRankedCandidates;
    }

    /**
     * 🤖 PLACEHOLDER FOR AI/ML DEVELOPER:
     * Put your Python/Flask microservice call, PMML evaluator, TensorFlow/ONNX Java models,
     * or custom ranking logic here to filter and sort the feed.
     */
    private List<Profile> applyMLRecommendationModels(List<Profile> candidates, String currentUserId) {
        // TODO: AI/ML Developer should implement filtering/ranking logic here.
        // For example:
        // - Sort candidates based on cosine similarity of skills/interests.
        // - Call an external AI inference service (e.g., Python FastAPI) with candidate data and user preferences.
        // - Filter out profiles that do not meet matching score thresholds.

        return candidates; // Currently returns raw candidates sorted chronologically/by database order
    }
}
