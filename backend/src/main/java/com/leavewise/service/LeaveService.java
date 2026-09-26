package com.leavewise.service;

import com.leavewise.domain.LeaveRequest;
import com.leavewise.domain.LeaveStatus;
import com.leavewise.domain.LeaveType;
import com.leavewise.domain.User;
import com.leavewise.repo.LeaveRequestRepository;
import com.leavewise.repo.LeaveTypeRepository;
import com.leavewise.web.ApiException;
import com.leavewise.web.dto.LeaveDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class LeaveService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);

    private final LeaveRequestRepository leaves;
    private final LeaveTypeRepository types;
    private final WorkdayService workdays;
    private final TeamService team;

    public LeaveService(LeaveRequestRepository leaves, LeaveTypeRepository types,
                        WorkdayService workdays, TeamService team) {
        this.leaves = leaves;
        this.types = types;
        this.workdays = workdays;
        this.team = team;
    }

    /* ---------- employee ---------- */

    @Transactional(readOnly = true)
    public List<BalanceDto> balances(User user) {
        int year = LocalDate.now().getYear();
        return types.findAllByOrderBySortOrderAsc().stream().map(t -> {
            BigDecimal used = used(user, t, year);
            return new BalanceDto(t.getCode(), t.getName(), t.getAnnualQuota(), used,
                    BigDecimal.valueOf(t.getAnnualQuota()).subtract(used));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveDto> myLeaves(User user) {
        return leaves.findByUserOrderByFromDateDesc(user).stream().map(LeaveDto::from).toList();
    }

    /** Live summary for the apply form. Nothing is saved. */
    @Transactional(readOnly = true)
    public PreviewDto preview(User user, String typeCode, LocalDate from, LocalDate to, boolean halfDay) {
        LeaveType type = type(typeCode);
        if (to.isBefore(from)) {
            throw ApiException.badRequest("Pick an end date on or after the start date.");
        }
        boolean half = halfDay && from.equals(to) && type.isHalfDayAllowed();
        WorkdayService.Workdays wd = workdays.between(from, to);
        BigDecimal days = workdays.countDays(from, to, half);
        BigDecimal left = left(user, type, from.getYear());
        return new PreviewDto(days, wd.holidaysSkipped(), left, left.subtract(days),
                team.busiest(user, from, to, null));
    }

    public LeaveDto apply(User user, CreateLeaveRequest req) {
        LeaveType type = type(req.typeCode());
        LocalDate from = req.from();
        LocalDate to = req.to();
        if (to.isBefore(from)) {
            throw ApiException.badRequest("The end date is before the start date.");
        }
        if (from.isBefore(LocalDate.now())) {
            throw ApiException.badRequest("Leave can't start in the past.");
        }
        if (req.halfDay() && (!from.equals(to) || !type.isHalfDayAllowed())) {
            throw ApiException.badRequest("Half days only work for a single day, and not for "
                    + type.getName().toLowerCase() + " leave.");
        }
        BigDecimal days = workdays.countDays(from, to, req.halfDay());
        if (days.signum() == 0) {
            throw ApiException.badRequest("Those dates are weekends or holidays, so there is nothing to apply for.");
        }
        leaves.findOverlapping(List.of(user), LeaveStatus.ACTIVE, from, to).stream().findFirst().ifPresent(l -> {
            throw ApiException.badRequest("You already have leave on " + range(l.getFromDate(), l.getToDate()) + ".");
        });
        BigDecimal left = left(user, type, from.getYear());
        if (left.compareTo(days) < 0) {
            throw ApiException.badRequest("You have " + left.stripTrailingZeros().toPlainString() + " "
                    + type.getName().toLowerCase() + " days left and this needs "
                    + days.stripTrailingZeros().toPlainString() + ".");
        }
        LeaveRequest saved = leaves.save(new LeaveRequest(user, type, from, to, req.halfDay(), days, req.reason().trim()));
        return LeaveDto.from(saved);
    }

    public LeaveDto cancel(User user, Long id) {
        LeaveRequest l = leaves.findById(id)
                .filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("That leave request doesn't exist."));
        boolean waiting = l.getStatus() == LeaveStatus.WAITING;
        boolean approvedFuture = l.getStatus() == LeaveStatus.APPROVED && l.getFromDate().isAfter(LocalDate.now());
        if (!waiting && !approvedFuture) {
            throw ApiException.badRequest("This leave can no longer be cancelled.");
        }
        l.cancel();
        return LeaveDto.from(l);
    }

    /* ---------- manager ---------- */

    @Transactional(readOnly = true)
    public List<ApprovalDto> waitingFor(User manager) {
        return leaves.findByUserManagerAndStatusOrderByFromDateAsc(manager, LeaveStatus.WAITING).stream()
                .map(l -> new ApprovalDto(LeaveDto.from(l), l.getUser().getJobTitle(),
                        // Waiting leave already counts as used, so this is the balance after approval.
                        left(l.getUser(), l.getType(), l.getFromDate().getYear()),
                        team.busiest(l.getUser(), l.getFromDate(), l.getToDate(), l.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveDto> recentDecisions(User manager) {
        return leaves.findTop10ByDecidedByOrderByDecidedAtDesc(manager).stream().map(LeaveDto::from).toList();
    }

    public LeaveDto decide(User manager, Long id, LeaveStatus outcome, String comment) {
        LeaveRequest l = leaves.findById(id)
                .filter(x -> x.getUser().getManager() != null
                        && x.getUser().getManager().getId().equals(manager.getId()))
                .orElseThrow(() -> ApiException.notFound("That request doesn't exist or isn't from your team."));
        if (l.getStatus() != LeaveStatus.WAITING) {
            throw ApiException.badRequest("This request has already been decided.");
        }
        String note = comment == null ? null : comment.trim();
        if (outcome == LeaveStatus.DECLINED && (note == null || note.length() < 3)) {
            throw ApiException.badRequest("Add a reason so " + l.getUser().firstName() + " can pick other dates.");
        }
        l.decide(outcome, manager, note == null || note.isEmpty() ? null : note);
        return LeaveDto.from(l);
    }

    /* ---------- helpers ---------- */

    private LeaveType type(String code) {
        return types.findById(code).orElseThrow(() -> ApiException.badRequest("Pick a valid leave type."));
    }

    private BigDecimal used(User user, LeaveType type, int year) {
        return leaves.sumDays(user, type, LeaveStatus.ACTIVE, LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    private BigDecimal left(User user, LeaveType type, int year) {
        return BigDecimal.valueOf(type.getAnnualQuota()).subtract(used(user, type, year));
    }

    private static String range(LocalDate from, LocalDate to) {
        return from.equals(to) ? DAY.format(from) : DAY.format(from) + " – " + DAY.format(to);
    }
}
