package com.leavewise.web;

import com.leavewise.service.CurrentUser;
import com.leavewise.service.TeamService;
import com.leavewise.web.dto.LeaveDtos.AwayPerson;
import com.leavewise.web.dto.LeaveDtos.CalendarDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/team")
public class TeamController {

    private final TeamService teamService;
    private final CurrentUser currentUser;

    public TeamController(TeamService teamService, CurrentUser currentUser) {
        this.teamService = teamService;
        this.currentUser = currentUser;
    }

    @GetMapping("/away")
    public List<AwayPerson> awaySoon(@AuthenticationPrincipal Jwt jwt,
                                     @RequestParam(defaultValue = "14") int days) {
        return teamService.awaySoon(currentUser.from(jwt), Math.min(Math.max(days, 1), 60));
    }

    /** month is in the form 2026-10. */
    @GetMapping("/calendar")
    public CalendarDto calendar(@AuthenticationPrincipal Jwt jwt, @RequestParam String month) {
        YearMonth ym;
        try {
            ym = YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Month must look like 2026-10.");
        }
        return teamService.calendar(currentUser.from(jwt), ym);
    }
}
