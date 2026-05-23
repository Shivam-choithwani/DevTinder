package com.devtinder.core.controller;

import com.devtinder.core.model.Swipe;
import com.devtinder.core.service.SwipeService;
import org.springframework.beans.factory.annotation.Autowired;
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
    public ResponseEntity<Swipe> submitSwipe(@RequestBody Swipe swipe) {
        Swipe processedSwipe = swipeService.processSwipe(swipe);
        return ResponseEntity.ok(processedSwipe);
    }
}
