package com.leavewise.repo;

import com.leavewise.domain.Role;
import com.leavewise.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findFirstByRoleOrderByIdAsc(Role role);

    List<User> findByTeamAndRoleOrderByName(String team, Role role);

    List<User> findByRoleOrderByName(Role role);
}
