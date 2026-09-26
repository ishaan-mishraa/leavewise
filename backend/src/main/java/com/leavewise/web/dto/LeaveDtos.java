package com.leavewise.web.dto;

import com.leavewise.domain.Holiday;
import com.leavewise.domain.LeaveRequest;
import com.leavewise.domain.LeaveStatus;
import com.leavewise.domain.LeaveType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class LeaveDtos {

    private LeaveDtos() {
    }

    public record LeaveTypeDto(String code, String name, int annualQuota, boolean halfDayAllowed) {
        public static LeaveTypeDto from(LeaveType t) {
            return new LeaveTypeDto(t.getCode(), t.getName(), t.getAnnualQuota(), t.isHalfDayAllowed());
        }
    }

    public record BalanceDto(String code, String name, int quota, BigDecimal used, BigDecimal left) {
    }

    public record LeaveDto(Long id, Long userId, String userName, String typeCode, String typeName,
                           LocalDate from, LocalDate to, boolean halfDay, BigDecimal days, String reason,
                           LeaveStatus status, String managerComment, String decidedBy,
                           Instant createdAt, Instant decidedAt) {
        public static LeaveDto from(LeaveRequest l) {
            return new LeaveDto(l.getId(), l.getUser().getId(), l.getUser().getName(),
                    l.getType().getCode(), l.getType().getName(), l.getFromDate(), l.getToDate(),
                    l.isHalfDay(), l.getDays(), l.getReason(), l.getStatus(), l.getManagerComment(),
                    l.getDecidedBy() == null ? null : l.getDecidedBy().getName(),
                    l.getCreatedAt(), l.getDecidedAt());
        }
    }

    public record CreateLeaveRequest(
            @NotBlank(message = "Pick a leave type.") String typeCode,
            @NotNull(message = "Choose a start date.") LocalDate from,
            @NotNull(message = "Choose an end date.") LocalDate to,
            boolean halfDay,
            @NotBlank(message = "Add a short reason.")
            @Size(min = 3, max = 250, message = "Keep the reason between 3 and 250 characters.") String reason) {
    }

    /** Someone who is away on a given day. */
    public record AwayPerson(Long userId, String name, String typeCode, LeaveStatus status,
                             LocalDate from, LocalDate to) {
        public static AwayPerson from(LeaveRequest l) {
            return new AwayPerson(l.getUser().getId(), l.getUser().getName(), l.getType().getCode(),
                    l.getStatus(), l.getFromDate(), l.getToDate());
        }
    }

    /** The busiest working day in a date range, counting the requester. */
    public record ClashDto(LocalDate date, List<AwayPerson> people, int total, int teamSize,
                           int limitPct, boolean overLimit) {
    }

    public record PreviewDto(BigDecimal days, List<String> holidaysSkipped, BigDecimal left,
                             BigDecimal leftAfter, ClashDto clash) {
    }

    public record ApprovalDto(LeaveDto leave, String jobTitle, BigDecimal leftAfter, ClashDto clash) {
    }

    public record DecisionRequest(@Size(max = 250, message = "Keep the comment under 250 characters.") String comment) {
    }

    public record CalendarDay(LocalDate date, boolean weekend, String holiday, List<AwayPerson> people,
                              boolean overLimit) {
    }

    public record CalendarDto(String month, String team, int teamSize, int limitPct, List<CalendarDay> days) {
    }

    public record HolidayDto(Long id, LocalDate date, String name) {
        public static HolidayDto from(Holiday h) {
            return new HolidayDto(h.getId(), h.getDate(), h.getName());
        }
    }

    public record CreateHolidayRequest(@NotNull(message = "Choose a date.") LocalDate date,
                                       @NotBlank(message = "Enter a name.")
                                       @Size(max = 80, message = "Keep the name under 80 characters.") String name) {
    }

    public record SettingsDto(@Min(value = 5, message = "The limit must be at least 5%.")
                              @Max(value = 90, message = "The limit can be at most 90%.") int clashLimitPct) {
    }

    public record LeaveTypeUpdate(@NotBlank String code,
                                  @Min(value = 0, message = "Days can't be negative.")
                                  @Max(value = 60, message = "Days can be at most 60.") int annualQuota,
                                  boolean halfDayAllowed) {
    }
}
