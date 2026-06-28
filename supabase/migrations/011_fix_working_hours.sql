-- 011: Correct working hours to match actual shop schedule
-- Website and llms.txt advertise: Mon-Fri 10:00-19:00, Sat 10:00-16:00

update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 1; -- Monday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 2; -- Tuesday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 3; -- Wednesday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 4; -- Thursday
update service_working_hours set open_time = '10:00', close_time = '19:00' where day_of_week = 5; -- Friday
update service_working_hours set open_time = '10:00', close_time = '16:00' where day_of_week = 6; -- Saturday
-- Sunday (day_of_week=0) already has is_open=false, no change needed.
