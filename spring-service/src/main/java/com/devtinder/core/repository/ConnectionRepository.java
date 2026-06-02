package com.devtinder.core.repository;

import com.devtinder.core.model.Connection;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConnectionRepository extends MongoRepository<Connection, String> {
    // Finds all matches for a specific user
    List<Connection> findByUserOneIdOrUserTwoId(String userOneId, String userTwoId);
}
