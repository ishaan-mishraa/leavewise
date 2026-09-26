package com.leavewise.web;

import com.leavewise.service.AdminService;
import com.leavewise.service.CurrentUser;
import com.leavewise.service.LeaveService;
import com.leavewise.web.dto.LeaveDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Endpoints for employees: balances, their own leave, applying and cancelling. */
@RestController
@RequestMapping("/api")
public class LeaveController {

    private final LeaveService leaveService;
    private final AdminService adminService;
    private final CurrentUser currentUser;

    public LeaveController(LeaveService leaveService, AdminService adminService, CurrentUser currentUser) {
        this.leaveService = leaveService;
        this.adminService = adminService;
        this.currentUser = currentUser;
    }

    @GetMapping("/leave-types")
    public List<LeaveTypeDto> leaveTypes() {
        return adminService.leaveTypes();
    }

    @GetMapping("/holidays")
    public List<HolidayDto> holidays() {
        return adminService.holidays();
    }

    @GetMapping("/me/balances")
    public List<BalanceDto> balances(@AuthenticationPrincipal Jwt jwt) {
        return leaveService.balances(currentUser.from(jwt));
    }

    @GetMapping("/me/leaves")
    public List<LeaveDto> myLeaves(@AuthenticationPrincipal Jwt jwt) {
        return leaveService.myLeaves(currentUser.from(jwt));
    }

    @GetMapping("/leaves/preview")
    public PreviewDto preview(@AuthenticationPrincipal Jwt jwt,
                              @RequestParam String type,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                              @RequestParam(defaultValue = "false") boolean halfDay) {
        return leaveService.preview(currentUser.from(jwt), type, from, to, halfDay);
    }

    @PostMapping("/leaves")
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveDto apply(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateLeaveRequest req) {
        return leaveService.apply(currentUser.from(jwt), req);
    }

    @PostMapping("/leaves/{id}/cancel")
    public LeaveDto cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return leaveService.cancel(currentUser.from(jwt), id);
    }
}
