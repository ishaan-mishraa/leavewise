package com.leavewise.repo;

import com.leavewise.domain.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, String> {

    List<LeaveType> findAllByOrderBySortOrderAsc();
}
