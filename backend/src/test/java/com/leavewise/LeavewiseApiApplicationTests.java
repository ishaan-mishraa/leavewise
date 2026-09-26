package com.leavewise;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs the main flows end to end: employee applies, manager decides, HR changes settings. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class LeavewiseApiApplicationTests {

    @LocalServerPort
    int port;

    RestClient http;
    final JsonMapper json = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        http = RestClient.builder().baseUrl("http://localhost:" + port).build();
    }

    record Res(int status, JsonNode body) {
    }

    Res call(HttpMethod method, String path, String token, String body) {
        RestClient.RequestBodySpec req = http.method(method).uri(path).contentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            req.header("Authorization", "Bearer " + token);
        }
        if (body != null) {
            req.body(body);
        }
        ResponseEntity<String> res = req.retrieve().onStatus(s -> true, (rq, rs) -> {
        }).toEntity(String.class);
        String text = res.getBody();
        return new Res(res.getStatusCode().value(), text == null || text.isBlank() ? null : json.readTree(text));
    }

    String demo(String role) {
        Res res = call(HttpMethod.POST, "/api/auth/demo", null, "{\"role\":\"" + role + "\"}");
        assertThat(res.status()).isEqualTo(200);
        return res.body().get("token").asString();
    }

    @Test
    void healthIsOpen() {
        assertThat(call(HttpMethod.GET, "/api/health", null, null).status()).isEqualTo(200);
    }

    @Test
    void wrongPasswordIsRejected() {
        Res res = call(HttpMethod.POST, "/api/auth/login", null,
                "{\"email\":\"ananya.iyer@leavewise.dev\",\"password\":\"nope\"}");
        assertThat(res.status()).isEqualTo(401);
    }

    @Test
    void employeeAppliesAndManagerDecides() {
        String employee = demo("EMPLOYEE");
        String manager = demo("MANAGER");

        Res balances = call(HttpMethod.GET, "/api/me/balances", employee, null);
        assertThat(balances.status()).isEqualTo(200);
        assertThat(balances.body().size()).isEqualTo(4);

        // The seeded team is busy on these dates, so the preview should warn about a clash.
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDate from = monday.plusWeeks(2).plusDays(2);
        LocalDate to = from.plusDays(1);
        Res preview = call(HttpMethod.GET, "/api/leaves/preview?type=EL&from=" + from + "&to=" + to, employee, null);
        assertThat(preview.status()).isEqualTo(200);
        assertThat(preview.body().get("clash").get("total").asInt()).isGreaterThanOrEqualTo(3);
        assertThat(preview.body().get("clash").get("overLimit").asBoolean()).isTrue();

        String body = "{\"typeCode\":\"EL\",\"from\":\"" + from + "\",\"to\":\"" + to
                + "\",\"halfDay\":false,\"reason\":\"Friend's wedding\"}";
        Res created = call(HttpMethod.POST, "/api/leaves", employee, body);
        assertThat(created.status()).isEqualTo(201);
        assertThat(created.body().get("status").asString()).isEqualTo("WAITING");
        long id = created.body().get("id").asLong();

        Res again = call(HttpMethod.POST, "/api/leaves", employee, body);
        assertThat(again.status()).isEqualTo(400);
        assertThat(again.body().get("message").asString()).contains("already have leave");

        assertThat(call(HttpMethod.GET, "/api/approvals", employee, null).status()).isEqualTo(403);

        Res waiting = call(HttpMethod.GET, "/api/approvals", manager, null);
        assertThat(waiting.status()).isEqualTo(200);
        assertThat(waiting.body().toString()).contains("Friend's wedding");

        Res noReason = call(HttpMethod.POST, "/api/approvals/" + id + "/decline", manager, "{\"comment\":\"\"}");
        assertThat(noReason.status()).isEqualTo(400);

        Res approved = call(HttpMethod.POST, "/api/approvals/" + id + "/approve", manager, "{}");
        assertThat(approved.status()).isEqualTo(200);
        assertThat(approved.body().get("status").asString()).isEqualTo("APPROVED");
    }

    @Test
    void onlyHrChangesSettings() {
        String hr = demo("HR");
        String employee = demo("EMPLOYEE");
        assertThat(call(HttpMethod.PUT, "/api/admin/settings", employee, "{\"clashLimitPct\":40}").status()).isEqualTo(403);
        Res res = call(HttpMethod.PUT, "/api/admin/settings", hr, "{\"clashLimitPct\":30}");
        assertThat(res.status()).isEqualTo(200);
        assertThat(res.body().get("clashLimitPct").asInt()).isEqualTo(30);

        Res calendar = call(HttpMethod.GET, "/api/team/calendar?month=" + LocalDate.now().toString().substring(0, 7), hr, null);
        assertThat(calendar.status()).isEqualTo(200);
        assertThat(calendar.body().get("teamSize").asInt()).isEqualTo(8);
    }
}
