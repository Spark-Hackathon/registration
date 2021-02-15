USE registration;

INSERT INTO system_settings (name, value_str) VALUES ("admin_code", "7e135d92-10d3-4a20-8e1d-4028d0587f99");

INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available) VALUES ("Web Design & Development", "2021-06-28", "2021-07-02", "RANDOM_CODE1", 1, 1);
INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available) VALUES ("Creative Coding", "2021-07-12", "2021-07-16", "RANDOM_CODE2", 1, 1);
INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available) VALUES ("Art of Games", "2021-07-19", "2021-07-23", "RANDOM_CODE3", 1, 1);

INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, hopes_dreams, tshirt_size, 
	borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES ("Charlie", "Hall", "chall22@students.stab.org",
	"2003-08-07", "St. Annes-Belfield", 11, "male", 5, "Caucasian", "I hope to learn more aboute Web Dev", "Xsmall", 0, "Kendra Hall",
	"kendrahall@gmail.com", 4344289463, 1);
INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, hopes_dreams, tshirt_size, 
	borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES ("Charles", "Hall", "chall20@students.stab.org",
	"2005-08-07", "St. Annes-Belfield", 9, "male", 1, "Caucasian", "I want to learn about video games", "Xsmall", 1, "Karen Hall",
	"karenhall@gmail.com", 4343847364, 0);

-- EACH enrollment for one camper is a week
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES (1, 1, "2021-02-15 18:50:23.599", 
	"SOME_UUID1", 1, 1);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES (1, 3, "2021-02-15 18:50:23.599", 
	"SOME_UUID1", 1, 1);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES (2, 2, "2021-02-17 08:50:50.823", 
	"SOME_UUID2", 1, 1);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES (2, 3, "2021-02-17 08:50:50.823", 
	"SOME_UUID2", 1, 1);