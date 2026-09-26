package com.leavewise.service;

import com.leavewise.domain.Holiday;
import com.leavewise.domain.LeaveType;
import com.leavewise.repo.HolidayRepository;
import com.leavewise.repo.LeaveTypeRepository;
import com.leavewise.web.ApiException;
import com.leavewise.web.dto.LeaveDtos.CreateHolidayRequest;
import com.leavewise.web.dto.LeaveDtos.HolidayDto;
import com.leavewise.web.dto.LeaveDtos.LeaveTypeDto;
import com.leavewise.web.dto.LeaveDtos.LeaveTypeUpdate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** HR settings: leave allowances and the holiday calendar. */
@Service
@Transactional
public class AdminService {

    private final LeaveTypeRepository types;
    private final HolidayRepository holidays;

    public AdminService(LeaveTypeRepository types, HolidayRepository holidays) {
        this.types = types;
        this.holidays = holidays;
    }

    @Transactional(readOnly = true)
    public List<LeaveTypeDto> leaveTypes() {
        return types.findAllByOrderBySortOrderAsc().stream().map(LeaveTypeDto::from).toList();
    }

    public List<LeaveTypeDto> updateLeaveTypes(List<LeaveTypeUpdate> updates) {
        for (LeaveTypeUpdate u : updates) {
            LeaveType t = types.findById(u.code())
                    .orElseThrow(() -> ApiException.badRequest("Unknown leave type " + u.code() + "."));
            t.update(u.annualQuota(), u.halfDayAllowed());
        }
        return leaveTypes();
    }

    @Transactional(readOnly = true)
    public List<HolidayDto> holidays() {
        return holidays.findAllByOrderByDateAsc().stream().map(HolidayDto::from).toList();
    }

    public HolidayDto addHoliday(CreateHolidayRequest req) {
        if (holidays.existsByDate(req.date())) {
            throw ApiException.badRequest("There is already a holiday on that date.");
        }
        return HolidayDto.from(holidays.save(new Holiday(req.date(), req.name().trim())));
    }

    public void deleteHoliday(Long id) {
        if (!holidays.existsById(id)) {
            throw ApiException.notFound("That holiday doesn't exist.");
        }
        holidays.deleteById(id);
    }
}
