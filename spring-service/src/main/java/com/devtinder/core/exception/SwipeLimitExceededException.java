package com.devtinder.core.exception;

public class SwipeLimitExceededException extends RuntimeException {
    public SwipeLimitExceededException(String message) {
        super(message);
    }
}
