package com.devtinder.core.controller;

import com.devtinder.core.dto.AuthRequest;
import com.devtinder.core.dto.AuthResponse;
import com.devtinder.core.dto.RegisterRequest;
import com.devtinder.core.dto.GoogleAuthRequest;
import com.devtinder.core.dto.GithubAuthRequest;
import com.devtinder.core.model.User;
import com.devtinder.core.repository.UserRepository;
import com.devtinder.core.security.JwtUtil;
import com.devtinder.core.service.OAuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private OAuthService oAuthService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registration) {
        if (userRepository.existsByEmail(registration.getEmail())) {
            return ResponseEntity.badRequest().body("Error: Email is already registered!");
        }
        if (userRepository.findByUsername(registration.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        // Hashing password
        User newUser = new User();
        newUser.setUsername(registration.getUsername());
        newUser.setEmail(registration.getEmail());
        newUser.setPassword(passwordEncoder.encode(registration.getPassword()));
        newUser.setRole(User.Role.USER);
        newUser.setSubscriptionTier(User.SubscriptionTier.FREE);

        userRepository.save(newUser);
        return ResponseEntity.ok("User registered successfully!");
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody AuthRequest loginRequest) {
        // Authenticate email and password
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
        );

        // Get user profile details
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found after verification"));

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getEmail(), user.getId()));
    }

    @PostMapping("/google")
    public ResponseEntity<?> authenticateGoogleUser(@Valid @RequestBody GoogleAuthRequest request) {
        try {
            OAuthService.OAuthUser googleUser = oAuthService.verifyGoogleIdToken(request.getIdToken());
            return handleOAuthUserLogin(googleUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Google authentication failed: " + e.getLocalizedMessage());
        }
    }

    @PostMapping("/github")
    public ResponseEntity<?> authenticateGithubUser(@Valid @RequestBody GithubAuthRequest request) {
        try {
            OAuthService.OAuthUser githubUser = oAuthService.exchangeGithubCode(request.getCode());
            return handleOAuthUserLogin(githubUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("GitHub authentication failed: " + e.getLocalizedMessage());
        }
    }

    private ResponseEntity<?> handleOAuthUserLogin(OAuthService.OAuthUser oauthUser) {
        // Check if user exists by email
        User user = userRepository.findByEmail(oauthUser.getEmail())
                .orElseGet(() -> {
                    // Create a new user if they don't exist
                    User newUser = new User();
                    newUser.setEmail(oauthUser.getEmail());

                    // Generate a unique username based on the email prefix
                    String baseUsername = oauthUser.getEmail().split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
                    if (baseUsername.isEmpty()) {
                        baseUsername = "user";
                    }
                    String uniqueUsername = baseUsername;
                    int suffix = 1;
                    while (userRepository.findByUsername(uniqueUsername).isPresent()) {
                        uniqueUsername = baseUsername + suffix;
                        suffix++;
                    }
                    newUser.setUsername(uniqueUsername);

                    // Set a secure random password since they authenticate via OAuth
                    newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                    newUser.setRole(User.Role.USER);
                    newUser.setSubscriptionTier(User.SubscriptionTier.FREE);

                    return userRepository.save(newUser);
                });

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getEmail(), user.getId()));
    }
}
