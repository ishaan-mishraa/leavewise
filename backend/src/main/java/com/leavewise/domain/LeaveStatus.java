package com.leavewise.domain;

import java.util.List;

public enum LeaveStatus {
    WAITING,
    APPROVED,
    DECLINED,
    CANCELLED;

    /** Statuses that take days from the balance and count someone as away. */
    public static final List<LeaveStatus> ACTIVE = List.of(WAITING, APPROVED);
}
