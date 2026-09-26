package com.leavewise.web;

import com.leavewise.domain.LeaveStatus;
import com.leavewise.service.CurrentUser;
import com.leavewise.service.LeaveService;
import com.leavewise.web.dto.LeaveDtos.ApprovalDto;
import com.leavewise.web.dto.LeaveDtos.DecisionRequest;
import com.leavewise.web.dto.LeaveDtos.LeaveDto;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Endpoints for managers. */
@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final LeaveService leaveService;
    private final CurrentUser currentUser;

    public ApprovalController(LeaveService leaveService, CurrentUser currentUser) {
        this.leaveService = leaveService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ApprovalDto> waiting(@AuthenticationPrincipal Jwt jwt) {
        return leaveService.waitingFor(currentUser.from(jwt));
    }

    @GetMapping("/recent")
    public List<LeaveDto> recent(@AuthenticationPrincipal Jwt jwt) {
        return leaveService.recentDecisions(currentUser.from(jwt));
    }

    @PostMapping("/{id}/approve")
    public LeaveDto approve(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                            @Valid @RequestBody(required = false) DecisionRequest req) {
        return leaveService.decide(currentUser.from(jwt), id, LeaveStatus.APPROVED, req == null ? null : req.comment());
    }

    @PostMapping("/{id}/decline")
    public LeaveDto decline(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                            @Valid @RequestBody DecisionRequest req) {
        return leaveService.decide(currentUser.from(jwt), id, LeaveStatus.DECLINED, req.comment());
    }
}
