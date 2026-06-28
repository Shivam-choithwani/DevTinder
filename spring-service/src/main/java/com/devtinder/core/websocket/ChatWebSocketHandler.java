package com.devtinder.core.websocket;

import com.devtinder.core.model.ChatMessage;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.ChatMessageRepository;
import com.devtinder.core.repository.UserRepository;
import com.devtinder.core.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ConcurrentHashMap<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Retrieve token from query string: ws://localhost:8080/ws/chat?token=JWT_TOKEN
        String query = session.getUri().getQuery();
        String token = null;
        if (query != null && query.contains("token=")) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    token = param.substring(6);
                    break;
                }
            }
        }

        if (token == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        try {
            String email = jwtUtil.extractUsername(token);
            if (email == null) {
                session.close(CloseStatus.BAD_DATA);
                return;
            }

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                session.close(CloseStatus.BAD_DATA);
                return;
            }

            String userId = user.getId();
            session.getAttributes().put("userId", userId);
            userSessions.put(userId, session);
            System.out.println("WebSocket Connected: User ID = " + userId + ", Session = " + session.getId());
        } catch (Exception e) {
            System.err.println("Error establishing WS connection: " + e.getMessage());
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String senderId = (String) session.getAttributes().get("userId");
        if (senderId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        String payload = message.getPayload();
        try {
            // Parse incoming JSON: { "recipientId": "xxx", "text": "yyy" }
            Map<?, ?> data = objectMapper.readValue(payload, Map.class);

            // Check if this is a WebRTC/Video Call signaling message
            String type = (String) data.get("type");
            if (type != null) {
                String recipientId = (String) data.get("recipientId");
                if (recipientId != null) {
                    WebSocketSession recipientSession = userSessions.get(recipientId);
                    if (recipientSession != null && recipientSession.isOpen()) {
                        Map<Object, Object> mutableData = new java.util.HashMap<>(data);
                        mutableData.put("senderId", senderId);
                        String forwardJson = objectMapper.writeValueAsString(mutableData);
                        recipientSession.sendMessage(new TextMessage(forwardJson));
                    }
                }
                return;
            }

            String recipientId = (String) data.get("recipientId");
            String text = (String) data.get("text");

            if (recipientId == null || text == null || text.trim().isEmpty()) {
                return;
            }

            // Save message to MongoDB
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setSenderId(senderId);
            chatMessage.setRecipientId(recipientId);
            chatMessage.setText(text);
            chatMessage.setTimestamp(LocalDateTime.now());

            ChatMessage savedMsg = chatMessageRepository.save(chatMessage);

            // Send to recipient if online
            WebSocketSession recipientSession = userSessions.get(recipientId);
            if (recipientSession != null && recipientSession.isOpen()) {
                String responseJson = objectMapper.writeValueAsString(savedMsg);
                recipientSession.sendMessage(new TextMessage(responseJson));
            }

            // Send echo/confirmation back to the sender
            if (session.isOpen()) {
                String responseJson = objectMapper.writeValueAsString(savedMsg);
                session.sendMessage(new TextMessage(responseJson));
            }
        } catch (Exception e) {
            System.err.println("Error handling WebSocket text message: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            userSessions.remove(userId);
            System.out.println("WebSocket Disconnected: User ID = " + userId + ", Session = " + session.getId());
        }
    }
}
