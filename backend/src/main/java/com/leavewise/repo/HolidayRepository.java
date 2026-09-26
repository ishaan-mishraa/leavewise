package com.leavewise.repo;

import com.leavewise.domain.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    List<Holiday> findByDateBetween(LocalDate from, LocalDate to);

    List<Holiday> findAllByOrderByDateAsc();

    boolean existsByDate(LocalDate date);
}
