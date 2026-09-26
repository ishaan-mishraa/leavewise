package com.leavewise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LeavewiseApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeavewiseApiApplication.class, args);
    }
}
