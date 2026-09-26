package com.leavewise.repo;

import com.leavewise.domain.LeaveRequest;
import com.leavewise.domain.LeaveStatus;
import com.leavewise.domain.LeaveType;
import com.leavewise.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByUserOrderByFromDateDesc(User user);

    /** Leave of any of the given people that overlaps the date range. */
    @Query("""
            select l from LeaveRequest l
            where l.user in :users and l.status in :statuses
              and l.fromDate <= :to and l.toDate >= :from
            order by l.fromDate
            """)
    List<LeaveRequest> findOverlapping(@Param("users") Collection<User> users,
                                       @Param("statuses") Collection<LeaveStatus> statuses,
                                       @Param("from") LocalDate from,
                                       @Param("to") LocalDate to);

    @Query("""
            select coalesce(sum(l.days), 0) from LeaveRequest l
            where l.user = :user and l.type = :type and l.status in :statuses
              and l.fromDate between :yearStart and :yearEnd
            """)
    BigDecimal sumDays(@Param("user") User user,
                       @Param("type") LeaveType type,
                       @Param("statuses") Collection<LeaveStatus> statuses,
                       @Param("yearStart") LocalDate yearStart,
                       @Param("yearEnd") LocalDate yearEnd);

    List<LeaveRequest> findByUserManagerAndStatusOrderByFromDateAsc(User manager, LeaveStatus status);

    List<LeaveRequest> findTop10ByDecidedByOrderByDecidedAtDesc(User manager);
}
