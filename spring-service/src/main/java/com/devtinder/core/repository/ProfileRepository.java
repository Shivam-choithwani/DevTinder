package com.devtinder.core.repository;

import com.devtinder.core.model.Profile;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfileRepository extends MongoRepository<Profile, String> {
    Optional<Profile> findByUserId(String userId);

    // 👇 ADD THIS METHOD
    List<Profile> findByUserIdNotIn(List<String> userIds);
}
