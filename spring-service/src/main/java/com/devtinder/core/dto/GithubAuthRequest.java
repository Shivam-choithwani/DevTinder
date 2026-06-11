package com.devtinder.core.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GithubAuthRequest {
    @NotBlank(message = "GitHub Authorization Code is required")
    private String code;
}
