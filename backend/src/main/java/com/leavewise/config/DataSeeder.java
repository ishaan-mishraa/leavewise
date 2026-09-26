package com.leavewise.config;

import com.leavewise.domain.*;
import com.leavewise.repo.LeaveRequestRepository;
import com.leavewise.repo.LeaveTypeRepository;
import com.leavewise.repo.UserRepository;
import com.leavewise.service.WorkdayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Fills an empty database with Team Orion and some leave, so every screen has something to show.
 * Leave dates are relative to today, so the demo always looks current. Runs only when there are no users.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String TEAM = "Team Orion";

    private final AppProperties props;
    private final UserRepository users;
    private final LeaveTypeRepository types;
    private final LeaveRequestRepository leaves;
    private final WorkdayService workdays;
    private final PasswordEncoder encoder;

    private LocalDate monday;
    private User manager;

    public DataSeeder(AppProperties props, UserRepository users, LeaveTypeRepository types,
                      LeaveRequestRepository leaves, WorkdayService workdays, PasswordEncoder encoder) {
        this.props = props;
        this.users = users;
        this.types = types;
        this.leaves = leaves;
        this.workdays = workdays;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.seedDemoData() || users.count() > 0) {
            return;
        }
        log.info("Empty database: adding sample users and leave");
        String hash = encoder.encode(props.demoPassword());
        monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));

        manager = users.save(new User("Rahul Verma", "rahul.verma@leavewise.dev", hash, Role.MANAGER,
                "Engineering Manager", TEAM, null));
        users.save(new User("Kavita Sen", "kavita.sen@leavewise.dev", hash, Role.HR,
                "HR Business Partner", null, null));

        User ananya = employee("Ananya Iyer", "ananya.iyer", "Software Engineer", hash);
        User rohan = employee("Rohan Das", "rohan.das", "Senior Engineer", hash);
        User sneha = employee("Sneha Patil", "sneha.patil", "QA Engineer", hash);
        User vikram = employee("Vikram Rao", "vikram.rao", "Tech Lead", hash);
        User priya = employee("Priya Nair", "priya.nair", "Business Analyst", hash);
        User karthik = employee("Karthik Menon", "karthik.menon", "Software Engineer", hash);
        User meera = employee("Meera Joshi", "meera.joshi", "UI Developer", hash);
        User aarav = employee("Aarav Sharma", "aarav.sharma", "DevOps Engineer", hash);

        // Ananya's history and one request that is still waiting
        leave(ananya, "EL", day(-17, 0), day(-17, 4), "Family trip to Coorg", LeaveStatus.APPROVED, null);
        leave(ananya, "CL", day(-9, 1), day(-9, 1), "Personal work", LeaveStatus.DECLINED,
                "Sprint demo is that day. Could you pick another date?");
        leave(ananya, "CL", day(-6, 4), day(-6, 4), "Bank paperwork", LeaveStatus.APPROVED, null);
        leave(ananya, "SL", day(-3, 1), day(-3, 2), "Viral fever", LeaveStatus.APPROVED, "Get well soon.");
        leave(ananya, "CL", day(4, 4), day(4, 4), "Sister's graduation ceremony", LeaveStatus.WAITING, null);

        // The team, with a busy week two weeks from now to show the clash warning
        leave(karthik, "SL", day(0, 0), day(0, 0), "Dental procedure", LeaveStatus.WAITING, null);
        leave(priya, "SL", day(1, 0), day(1, 0), "Doctor appointment", LeaveStatus.APPROVED, null);
        leave(karthik, "CO", day(1, 4), day(1, 4), "Worked on the release weekend", LeaveStatus.APPROVED, null);
        leave(rohan, "EL", day(2, 0), day(2, 4), "Cousin's wedding in Kolkata", LeaveStatus.APPROVED, null);
        leave(vikram, "EL", day(2, 1), day(2, 4), "Family vacation", LeaveStatus.APPROVED, null);
        leave(sneha, "CL", day(2, 2), day(2, 3), "Moving to a new flat", LeaveStatus.WAITING, null);
        leave(meera, "EL", day(3, 0), day(3, 4), "Durga Puja with family in Pune", LeaveStatus.WAITING, null);
        leave(aarav, "CL", day(4, 0), day(4, 0), "Personal work", LeaveStatus.APPROVED, null);
    }

    private User employee(String name, String login, String title, String hash) {
        return users.save(new User(name, login + "@leavewise.dev", hash, Role.EMPLOYEE, title, TEAM, manager));
    }

    /** A weekday relative to next Monday: week 0 is next week, dayOfWeek 0 is Monday. */
    private LocalDate day(int week, int dayOfWeek) {
        return monday.plusWeeks(week).plusDays(dayOfWeek);
    }

    private void leave(User user, String type, LocalDate from, LocalDate to, String reason,
                       LeaveStatus status, String comment) {
        BigDecimal days = workdays.countDays(from, to, false);
        if (days.signum() == 0) {
            return; // the dates landed on a holiday
        }
        LeaveRequest l = new LeaveRequest(user, types.getReferenceById(type), from, to, false, days, reason);
        if (status != LeaveStatus.WAITING) {
            l.decide(status, manager, comment);
        }
        leaves.save(l);
    }
}
