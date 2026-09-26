package com.leavewise.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "leave_types")
public class LeaveType {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "annual_quota", nullable = false)
    private int annualQuota;

    @Column(name = "half_day_allowed", nullable = false)
    private boolean halfDayAllowed;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected LeaveType() {
    }

    public String getCode() { return code; }
    public String getName() { return name; }
    public int getAnnualQuota() { return annualQuota; }
    public boolean isHalfDayAllowed() { return halfDayAllowed; }
    public int getSortOrder() { return sortOrder; }

    public void update(int annualQuota, boolean halfDayAllowed) {
        this.annualQuota = annualQuota;
        this.halfDayAllowed = halfDayAllowed;
    }
}
