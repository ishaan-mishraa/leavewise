package com.leavewise.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Settings under "app." in application.yml. Each can be overridden with an environment variable. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        int jwtExpiryHours,
        List<String> corsOrigins,
        boolean demoLogin,
        String demoPassword,
        boolean seedDemoData) {
}
