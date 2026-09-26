package com.leavewise.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "job_title")
    private String jobTitle;

    private String team;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    private User manager;

    protected User() {
    }

    public User(String name, String email, String passwordHash, Role role, String jobTitle, String team, User manager) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.jobTitle = jobTitle;
        this.team = team;
        this.manager = manager;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public String getJobTitle() { return jobTitle; }
    public String getTeam() { return team; }
    public User getManager() { return manager; }

    public String firstName() {
        return name.split(" ")[0];
    }
}
