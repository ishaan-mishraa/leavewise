package com.leavewise.service;

import com.leavewise.domain.LeaveRequest;
import com.leavewise.domain.LeaveStatus;
import com.leavewise.domain.Role;
import com.leavewise.domain.User;
import com.leavewise.repo.LeaveRequestRepository;
import com.leavewise.repo.UserRepository;
import com.leavewise.web.dto.LeaveDtos.AwayPerson;
import com.leavewise.web.dto.LeaveDtos.CalendarDay;
import com.leavewise.web.dto.LeaveDtos.CalendarDto;
import com.leavewise.web.dto.LeaveDtos.ClashDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/** Answers "who else is away?" questions for a team. */
@Service
@Transactional(readOnly = true)
public class TeamService {

    private final UserRepository users;
    private final LeaveRequestRepository leaves;
    private final WorkdayService workdays;
    private final SettingsService settings;

    public TeamService(UserRepository users, LeaveRequestRepository leaves,
                       WorkdayService workdays, SettingsService settings) {
        this.users = users;
        this.leaves = leaves;
        this.workdays = workdays;
        this.settings = settings;
    }

    /** Employees in the same team. HR has no team, so they see every employee. */
    public List<User> teamOf(User user) {
        return user.getTeam() != null
                ? users.findByTeamAndRoleOrderByName(user.getTeam(), Role.EMPLOYEE)
                : users.findByRoleOrderByName(Role.EMPLOYEE);
    }

    /**
     * Finds the working day in the range when the most teammates are away.
     * The total counts the requester too. Returns null when the range has no working days.
     */
    public ClashDto busiest(User requester, LocalDate from, LocalDate to, Long excludeLeaveId) {
        List<LocalDate> days = workdays.between(from, to).dates();
        if (days.isEmpty()) {
            return null;
        }
        List<User> team = teamOf(requester);
        List<LeaveRequest> others = team.isEmpty() ? List.of() :
                leaves.findOverlapping(team, LeaveStatus.ACTIVE, from, to).stream()
                        .filter(l -> !l.getUser().getId().equals(requester.getId()))
                        .filter(l -> !Objects.equals(l.getId(), excludeLeaveId))
                        .toList();

        LocalDate bestDay = days.get(0);
        List<LeaveRequest> best = List.of();
        for (LocalDate day : days) {
            List<LeaveRequest> away = awayOn(others, day);
            if (away.size() > best.size()) {
                bestDay = day;
                best = away;
            }
        }
        int limit = settings.clashLimitPct();
        int total = best.size() + 1;
        return new ClashDto(bestDay, best.stream().map(AwayPerson::from).toList(), total, team.size(),
                limit, isOver(total, team.size(), limit));
    }

    /** Teammates (not including me) with leave in the next few days. */
    public List<AwayPerson> awaySoon(User me, int days) {
        List<User> team = teamOf(me);
        if (team.isEmpty()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();
        return leaves.findOverlapping(team, LeaveStatus.ACTIVE, today, today.plusDays(days)).stream()
                .filter(l -> !l.getUser().getId().equals(me.getId()))
                .map(AwayPerson::from)
                .toList();
    }

    public CalendarDto calendar(User me, YearMonth month) {
        List<User> team = teamOf(me);
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        Map<LocalDate, String> holidays = workdays.holidayNames(from, to);
        List<LeaveRequest> monthLeaves = team.isEmpty() ? List.of()
                : leaves.findOverlapping(team, LeaveStatus.ACTIVE, from, to);
        int limit = settings.clashLimitPct();

        List<CalendarDay> days = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            boolean weekend = WorkdayService.isWeekend(d);
            String holiday = holidays.get(d);
            List<LeaveRequest> away = weekend || holiday != null ? List.of() : awayOn(monthLeaves, d);
            days.add(new CalendarDay(d, weekend, holiday, away.stream().map(AwayPerson::from).toList(),
                    isOver(away.size(), team.size(), limit)));
        }
        String teamName = me.getTeam() != null ? me.getTeam() : "All employees";
        return new CalendarDto(month.toString(), teamName, team.size(), limit, days);
    }

    static boolean isOver(int away, int teamSize, int limitPct) {
        return teamSize > 0 && away * 100.0 / teamSize > limitPct;
    }

    /** One entry per person who has leave covering the day. */
    private static List<LeaveRequest> awayOn(List<LeaveRequest> candidates, LocalDate day) {
        Map<Long, LeaveRequest> byPerson = new LinkedHashMap<>();
        for (LeaveRequest l : candidates) {
            if (l.covers(day)) {
                byPerson.putIfAbsent(l.getUser().getId(), l);
            }
        }
        return new ArrayList<>(byPerson.values());
    }
}
