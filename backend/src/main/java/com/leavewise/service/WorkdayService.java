package com.leavewise.service;

import com.leavewise.domain.Holiday;
import com.leavewise.repo.HolidayRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Counts working days: every weekday that is not a company holiday. */
@Service
public class WorkdayService {

    private final HolidayRepository holidays;

    public WorkdayService(HolidayRepository holidays) {
        this.holidays = holidays;
    }

    public record Workdays(List<LocalDate> dates, List<String> holidaysSkipped) {
    }

    public Workdays between(LocalDate from, LocalDate to) {
        Map<LocalDate, String> holidayNames = holidayNames(from, to);
        List<LocalDate> dates = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (isWeekend(d)) {
                continue;
            }
            if (holidayNames.containsKey(d)) {
                skipped.add(holidayNames.get(d));
            } else {
                dates.add(d);
            }
        }
        return new Workdays(dates, skipped);
    }

    public BigDecimal countDays(LocalDate from, LocalDate to, boolean halfDay) {
        int n = between(from, to).dates().size();
        if (halfDay && n == 1) {
            return new BigDecimal("0.5");
        }
        return BigDecimal.valueOf(n);
    }

    public Map<LocalDate, String> holidayNames(LocalDate from, LocalDate to) {
        return holidays.findByDateBetween(from, to).stream()
                .collect(Collectors.toMap(Holiday::getDate, Holiday::getName));
    }

    public static boolean isWeekend(LocalDate d) {
        return d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
    }
}
