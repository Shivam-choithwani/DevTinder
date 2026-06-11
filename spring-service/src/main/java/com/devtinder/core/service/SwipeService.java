package com.devtinder.core.service;


import com.devtinder.core.model.Connection;
import com.devtinder.core.model.Swipe;
import com.devtinder.core.repository.ConnectionRepository;
import com.devtinder.core.repository.SwipeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import com.devtinder.core.model.Connection;
import com.devtinder.core.model.Swipe;
import com.devtinder.core.model.User; // <-- ADD THIS IMPORT
import com.devtinder.core.repository.ConnectionRepository;
import com.devtinder.core.repository.SwipeRepository;
import com.devtinder.core.repository.UserRepository; // <-- ADD THIS IMPORT
import com.devtinder.core.exception.SwipeLimitExceededException; // <-- ADD THIS IMPORT
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate; // <-- ADD THIS IMPORT
import java.time.LocalDateTime;
import java.util.Optional;
@Service
public class SwipeService {

    @Autowired
    private SwipeRepository swipeRepository;

    @Autowired
    private ConnectionRepository connectionRepository;

    @Autowired // <-- ADD THIS INJECTION
    private UserRepository userRepository;

    // This is the main Matchmaking Algorithm
    public Swipe processSwipe(Swipe swipe) {
        // 0. Verify and track daily limits for FREE tier users
        User swiper = userRepository.findById(swipe.getSwiperUserId())
                .orElseThrow(() -> new RuntimeException("Swiper user not found"));

        if (swiper.getSubscriptionTier() == null || swiper.getSubscriptionTier() == User.SubscriptionTier.FREE) {
            LocalDate today = LocalDate.now();
            if (swiper.getLastSwipeDate() != null && swiper.getLastSwipeDate().equals(today)) {
                if (swiper.getDailySwipeCount() >= 20) {
                    throw new SwipeLimitExceededException("You have reached your daily swipe limit. Upgrade to PRO for unlimited swipes.");
                }
                swiper.setDailySwipeCount(swiper.getDailySwipeCount() + 1);
            } else {
                swiper.setDailySwipeCount(1);
                swiper.setLastSwipeDate(today);
            }
            userRepository.save(swiper);
        }

        // 1. Save the new swipe
        swipe.setTimestamp(LocalDateTime.now());
        Swipe savedSwipe = swipeRepository.save(swipe);

        // 2. If it was a "Left Swipe" (Pass), we don't do anything else!
        if (!swipe.isRightSwipe()) {
            return savedSwipe;
        }

        // 3. If it WAS a Right Swipe, check if the other person already liked them!
        // Notice how we flip the IDs to see if the Target swiped on the Swiper
        Optional<Swipe> reverseSwipe = swipeRepository.findBySwiperUserIdAndTargetUserId(
                swipe.getTargetUserId(),
                swipe.getSwiperUserId()
        );

        // 4. If the reverse swipe exists AND it was a Right Swipe, IT'S A MATCH!
        if (reverseSwipe.isPresent() && reverseSwipe.get().isRightSwipe()) {
            System.out.println("🎉 WE HAVE A MATCH! Generating Connection...");

            Connection newMatch = new Connection();
            newMatch.setUserOneId(swipe.getSwiperUserId());
            newMatch.setUserTwoId(swipe.getTargetUserId());
            newMatch.setCreatedAt(LocalDateTime.now());

            connectionRepository.save(newMatch);
        }

        return savedSwipe;
    }

}
