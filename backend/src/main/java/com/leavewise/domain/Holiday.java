package com.leavewise.domain;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "holidays")
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate date;

    @Column(nullable = false)
    private String name;

    protected Holiday() {
    }

    public Holiday(LocalDate date, String name) {
        this.date = date;
        this.name = name;
    }

    public Long getId() { return id; }
    public LocalDate getDate() { return date; }
    public String getName() { return name; }
}
