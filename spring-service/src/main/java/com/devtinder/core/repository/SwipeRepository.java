package com.devtinder.core.repository;

import com.devtinder.core.model.Swipe;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SwipeRepository extends MongoRepository<Swipe, String> {
    Optional<Swipe> findBySwiperUserIdAndTargetUserId(String swiperUserId, String targetUserId);

    // 👇 ADD THIS METHOD
    List<Swipe> findBySwiperUserId(String swiperUserId);
}
