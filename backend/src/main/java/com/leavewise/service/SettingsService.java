package com.leavewise.service;

import com.leavewise.domain.AppSetting;
import com.leavewise.repo.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    static final String CLASH_LIMIT = "clash_limit_pct";
    private static final int DEFAULT_CLASH_LIMIT = 30;

    private final AppSettingRepository settings;

    public SettingsService(AppSettingRepository settings) {
        this.settings = settings;
    }

    /** Percentage of a team that can be away on one day before a clash warning shows. */
    public int clashLimitPct() {
        return settings.findById(CLASH_LIMIT)
                .map(s -> Integer.parseInt(s.getValue()))
                .orElse(DEFAULT_CLASH_LIMIT);
    }

    @Transactional
    public void setClashLimitPct(int pct) {
        AppSetting s = settings.findById(CLASH_LIMIT).orElseGet(() -> new AppSetting(CLASH_LIMIT, ""));
        s.setValue(String.valueOf(pct));
        settings.save(s);
    }
}
