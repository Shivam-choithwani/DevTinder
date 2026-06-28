package com.devtinder.core.controller;

import com.devtinder.core.model.ChatMessage;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.ChatMessageRepository;
import com.devtinder.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    // GET /api/chat/messages/{otherUserId} -> Returns all messages between logged-in user and otherUserId
    @GetMapping("/messages/{otherUserId}")
    public ResponseEntity<?> getChatHistory(@PathVariable String otherUserId, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String email = principal.getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged-in user details not found"));

        List<ChatMessage> history = chatMessageRepository.findChatHistory(
                currentUser.getId(),
                otherUserId,
                Sort.by(Sort.Direction.ASC, "timestamp")
        );

        return ResponseEntity.ok(history);
    }
}
