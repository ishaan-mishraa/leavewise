package com.leavewise.web.dto;

import com.leavewise.domain.Role;
import com.leavewise.domain.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank(message = "Enter your email.") String email,
                               @NotBlank(message = "Enter your password.") String password) {
    }

    public record DemoLoginRequest(@NotNull(message = "Pick a role.") Role role) {
    }

    public record UserDto(Long id, String name, String email, Role role, String jobTitle, String team, String managerName) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.getJobTitle(), u.getTeam(),
                    u.getManager() == null ? null : u.getManager().getName());
        }
    }

    public record AuthResponse(String token, UserDto user) {
    }

    public record DemoAccount(Role role, String name) {
    }
}
