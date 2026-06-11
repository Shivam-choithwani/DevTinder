package com.devtinder.core.controller;

import com.devtinder.core.model.Swipe;
import com.devtinder.core.service.SwipeService;
import com.devtinder.core.exception.SwipeLimitExceededException; // <-- ADD THIS IMPORT
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus; // <-- ADD THIS IMPORT
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/swipes")
@CrossOrigin(origins = "*")
public class SwipeController {

    @Autowired
    private SwipeService swipeService;

    // POST /api/swipes -> React sends the swipe data here when a user swipes on screen
    @PostMapping
    public ResponseEntity<?> submitSwipe(@RequestBody Swipe swipe) {
        try {
            Swipe processedSwipe = swipeService.processSwipe(swipe);
            return ResponseEntity.ok(processedSwipe);
        } catch (SwipeLimitExceededException e) {
            // Return 429 Too Many Requests status with the limit message
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(e.getMessage());
        }
    }
}
