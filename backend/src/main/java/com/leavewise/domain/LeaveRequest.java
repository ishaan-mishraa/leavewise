package com.leavewise.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "leave_requests")
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "type_code")
    private LeaveType type;

    @Column(name = "from_date", nullable = false)
    private LocalDate fromDate;

    @Column(name = "to_date", nullable = false)
    private LocalDate toDate;

    @Column(name = "half_day", nullable = false)
    private boolean halfDay;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal days;

    @Column(nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveStatus status;

    @Column(name = "manager_comment")
    private String managerComment;

    @ManyToOne
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LeaveRequest() {
    }

    public LeaveRequest(User user, LeaveType type, LocalDate fromDate, LocalDate toDate,
                        boolean halfDay, BigDecimal days, String reason) {
        this.user = user;
        this.type = type;
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.halfDay = halfDay;
        this.days = days;
        this.reason = reason;
        this.status = LeaveStatus.WAITING;
        this.createdAt = Instant.now();
    }

    public void decide(LeaveStatus outcome, User manager, String comment) {
        this.status = outcome;
        this.decidedBy = manager;
        this.managerComment = comment;
        this.decidedAt = Instant.now();
    }

    public void cancel() {
        this.status = LeaveStatus.CANCELLED;
    }

    public boolean covers(LocalDate date) {
        return !date.isBefore(fromDate) && !date.isAfter(toDate);
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public LeaveType getType() { return type; }
    public LocalDate getFromDate() { return fromDate; }
    public LocalDate getToDate() { return toDate; }
    public boolean isHalfDay() { return halfDay; }
    public BigDecimal getDays() { return days; }
    public String getReason() { return reason; }
    public LeaveStatus getStatus() { return status; }
    public String getManagerComment() { return managerComment; }
    public User getDecidedBy() { return decidedBy; }
    public Instant getDecidedAt() { return decidedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
