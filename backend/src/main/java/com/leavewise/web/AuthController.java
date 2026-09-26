package com.leavewise.web;

import com.leavewise.config.AppProperties;
import com.leavewise.domain.Role;
import com.leavewise.domain.User;
import com.leavewise.repo.UserRepository;
import com.leavewise.service.CurrentUser;
import com.leavewise.service.TokenService;
import com.leavewise.web.dto.AuthDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final CurrentUser currentUser;
    private final AppProperties props;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, TokenService tokens,
                          CurrentUser currentUser, AppProperties props) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.currentUser = currentUser;
        this.props = props;
    }

    /** Used by the host's health check, and to wake the server up. */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        User user = users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "That email and password don't match."));
        return new AuthResponse(tokens.issue(user), UserDto.from(user));
    }

    /** Who the one-click sample buttons sign in as, so the sign-in page can show their names. */
    @GetMapping("/auth/demo")
    public List<DemoAccount> demoAccounts() {
        if (!props.demoLogin()) {
            return List.of();
        }
        return Arrays.stream(Role.values())
                .flatMap(role -> users.findFirstByRoleOrderByIdAsc(role).stream())
                .map(u -> new DemoAccount(u.getRole(), u.getName()))
                .toList();
    }

    /** One-click sign-in as a sample user, so reviewers can try each role. Off when DEMO_LOGIN=false. */
    @PostMapping("/auth/demo")
    public AuthResponse demo(@Valid @RequestBody DemoLoginRequest req) {
        if (!props.demoLogin()) {
            throw ApiException.notFound("Demo sign-in is turned off.");
        }
        User user = users.findFirstByRoleOrderByIdAsc(req.role())
                .orElseThrow(() -> ApiException.notFound("There is no sample user with that role."));
        return new AuthResponse(tokens.issue(user), UserDto.from(user));
    }

    @GetMapping("/auth/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(currentUser.from(jwt));
    }
}
