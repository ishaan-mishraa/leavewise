package com.leavewise.web;

import com.leavewise.service.AdminService;
import com.leavewise.service.SettingsService;
import com.leavewise.web.dto.LeaveDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints for HR. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final SettingsService settingsService;

    public AdminController(AdminService adminService, SettingsService settingsService) {
        this.adminService = adminService;
        this.settingsService = settingsService;
    }

    @PutMapping("/leave-types")
    public List<LeaveTypeDto> updateLeaveTypes(@RequestBody List<@Valid LeaveTypeUpdate> updates) {
        return adminService.updateLeaveTypes(updates);
    }

    @GetMapping("/settings")
    public SettingsDto settings() {
        return new SettingsDto(settingsService.clashLimitPct());
    }

    @PutMapping("/settings")
    public SettingsDto updateSettings(@Valid @RequestBody SettingsDto req) {
        settingsService.setClashLimitPct(req.clashLimitPct());
        return new SettingsDto(settingsService.clashLimitPct());
    }

    @PostMapping("/holidays")
    @ResponseStatus(HttpStatus.CREATED)
    public HolidayDto addHoliday(@Valid @RequestBody CreateHolidayRequest req) {
        return adminService.addHoliday(req);
    }

    @DeleteMapping("/holidays/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHoliday(@PathVariable Long id) {
        adminService.deleteHoliday(id);
    }
}
