INSERT INTO leave_types (code, name, annual_quota, half_day_allowed, sort_order) VALUES
    ('EL', 'Earned',   18, FALSE, 1),
    ('CL', 'Casual',   12, TRUE,  2),
    ('SL', 'Sick',     10, TRUE,  3),
    ('CO', 'Comp-off',  2, TRUE,  4);

INSERT INTO holidays (holiday_date, name) VALUES
    ('2026-01-26', 'Republic Day'),
    ('2026-03-04', 'Holi'),
    ('2026-08-15', 'Independence Day'),
    ('2026-10-02', 'Gandhi Jayanti'),
    ('2026-10-20', 'Dussehra'),
    ('2026-11-09', 'Diwali'),
    ('2026-12-25', 'Christmas'),
    ('2027-01-26', 'Republic Day'),
    ('2027-03-22', 'Holi'),
    ('2027-08-15', 'Independence Day'),
    ('2027-10-02', 'Gandhi Jayanti'),
    ('2027-10-29', 'Diwali'),
    ('2027-12-25', 'Christmas');

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('clash_limit_pct', '30');
