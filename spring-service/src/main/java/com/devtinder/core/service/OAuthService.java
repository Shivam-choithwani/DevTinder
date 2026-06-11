package com.devtinder.core.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class OAuthService {

    @Value("${google.client.id}")
    private String googleClientId;

    @Value("${github.client.id}")
    private String githubClientId;

    @Value("${github.client.secret}")
    private String githubClientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    @Getter
    @AllArgsConstructor
    public static class OAuthUser {
        private String email;
        private String name;
        private String pictureUrl;
    }

    /**
     * Verifies Google ID token and returns User Profile
     */
    public OAuthUser verifyGoogleIdToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();

                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                return new OAuthUser(email, name, pictureUrl);
            } else {
                throw new RuntimeException("Invalid Google ID Token");
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify Google ID Token: " + e.getMessage(), e);
        }
    }

    /**
     * Exchanges GitHub authorization code for user info
     */
    @SuppressWarnings("rawtypes")
    public OAuthUser exchangeGithubCode(String code) {
        try {
            // 1. Exchange authorization code for access token
            String tokenUrl = "https://github.com/login/oauth/access_token" +
                    "?client_id=" + githubClientId +
                    "&client_secret=" + githubClientSecret +
                    "&code=" + code;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> tokenResponse = restTemplate.exchange(
                    tokenUrl,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> body = tokenResponse.getBody();
            if (body == null || !body.containsKey("access_token")) {
                throw new RuntimeException("Failed to retrieve access token from GitHub");
            }

            String accessToken = (String) body.get("access_token");

            // 2. Fetch User Profile using access token
            HttpHeaders userHeaders = new HttpHeaders();
            userHeaders.set("Authorization", "token " + accessToken);
            userHeaders.set("Accept", "application/json");
            HttpEntity<String> userEntity = new HttpEntity<>(userHeaders);

            ResponseEntity<Map> userResponse = restTemplate.exchange(
                    "https://api.github.com/user",
                    HttpMethod.GET,
                    userEntity,
                    Map.class
            );

            Map<String, Object> userProfile = userResponse.getBody();
            if (userProfile == null) {
                throw new RuntimeException("Failed to retrieve user profile from GitHub");
            }

            String name = (String) userProfile.get("name");
            if (name == null) {
                name = (String) userProfile.get("login"); // Fallback to login/username
            }
            String pictureUrl = (String) userProfile.get("avatar_url");

            // 3. Fetch User Email (GitHub might not return it in userProfile if it is private)
            String email = (String) userProfile.get("email");
            if (email == null) {
                ResponseEntity<List> emailsResponse = restTemplate.exchange(
                        "https://api.github.com/user/emails",
                        HttpMethod.GET,
                        userEntity,
                        List.class
                );

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> emails = emailsResponse.getBody();
                if (emails != null && !emails.isEmpty()) {
                    for (Map<String, Object> emailObj : emails) {
                        Boolean primary = (Boolean) emailObj.get("primary");
                        Boolean verified = (Boolean) emailObj.get("verified");
                        if (Boolean.TRUE.equals(primary) && Boolean.TRUE.equals(verified)) {
                            email = (String) emailObj.get("email");
                            break;
                        }
                    }
                    // Fallback to first email if no primary verified is found
                    if (email == null) {
                        email = (String) emails.get(0).get("email");
                    }
                }
            }

            if (email == null) {
                throw new RuntimeException("No email associated with this GitHub account could be retrieved.");
            }

            return new OAuthUser(email, name, pictureUrl);
        } catch (Exception e) {
            throw new RuntimeException("Failed to complete GitHub OAuth: " + e.getMessage(), e);
        }
    }
}
