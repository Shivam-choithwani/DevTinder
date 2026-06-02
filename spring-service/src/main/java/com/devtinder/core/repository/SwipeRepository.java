package com.devtinder.core.repository;

import com.devtinder.core.model.Swipe;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SwipeRepository extends MongoRepository<Swipe, String> {
    // Used to check if User B already liked User A
    Optional<Swipe> findBySwiperUserIdAndTargetUserId(String swiperUserId, String targetUserId);
}
