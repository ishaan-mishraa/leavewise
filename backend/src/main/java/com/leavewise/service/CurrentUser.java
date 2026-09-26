package com.leavewise.service;

import com.leavewise.domain.User;
import com.leavewise.repo.UserRepository;
import com.leavewise.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Loads the signed-in user from the JWT on the request. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public User from(Jwt jwt) {
        return users.findById(Long.valueOf(jwt.getSubject()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Your account no longer exists. Sign in again."));
    }
}
