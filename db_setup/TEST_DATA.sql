USE registration;

INSERT INTO system_settings (name, value_str) VALUES ("admin_code", "7e135d92-10d3-4a20-8e1d-4028d0587f99");

INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available, description) VALUES ("Web Design & Development", "2021-06-28", "2021-07-02", "RANDOM_CODE1", 1, 1, 
	"Web Dev & Development: Ever wanted to learn about HTML, CSS, & JavaScript? No matter your skill level, you're bound to learn something new. By the time you're finished, you'll have the tools and knowledge to make your own amazing websites.");
INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available, description) VALUES ("Creative Coding", "2021-07-12", "2021-07-16", "RANDOM_CODE2", 1, 1,
	"Creative Coding: How can coding be traditionally 'creative?' Unlike other art forms, you don't see the code itself, but the result of it. Join us in learning how to make digital art with code, and unlock your inner artist.");
INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available, description) VALUES ("Art of Games", "2021-07-19", "2021-07-23", "RANDOM_CODE3", 1, 1,
	"Art of Games: If you like to play or make games, this is the week for you! Learn the elements of game design–from the initial idea to storyboarding–and how to produce it! Never be bored again.");

INSERT INTO question_meta (week_id, question_text) VALUES (1, "Why do you think web should be an important component of school life?");
INSERT INTO question_meta (week_id, question_text) VALUES (2, "Do you think coding can be creative? Interpet");
INSERT INTO question_meta (week_id, question_text) VALUES (3, "How do you think you might use art to provide a more wonderful game?");
INSERT INTO question_meta (week_id, question_text) VALUES (1, "Is there purpose behind creating a beautiful experience for users?");

INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, hopes_dreams, tshirt_size, 
	borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES ("Charlie", "Hall", "chall22@students.stab.org",
	"2003-08-07", "St. Annes-Belfield", 11, "male", 5, "Caucasian", "I hope to learn more aboute Web Dev", "Xsmall", 0, "Kendra Hall",
	"kendrahall@gmail.com", 4344289463, 1);
INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, hopes_dreams, tshirt_size, 
	borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES ("Charles", "Hall", "chall20@students.stab.org",
	"2005-08-07", "St. Annes-Belfield", 9, "male", 1, "Caucasian", "I want to learn about video games", "Xsmall", 1, "Karen Hall",
	"karenhall@gmail.com", 4343847364, 0);

-- EACH enrollment for one camper is a week
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved, confirmed) VALUES (1, 1, "2021-02-15 18:50:23.599", 
	"SOME_UUID1", 1, 1, 0);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved, confirmed) VALUES (1, 3, "2021-02-15 18:50:23.599", 
	"SOME_UUID1", 1, 1, 0);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved, confirmed) VALUES (2, 2, "2021-02-17 08:50:50.823", 
	"SOME_UUID2", 1, 0, 0);
INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved, confirmed) VALUES (2, 3, "2021-02-17 08:50:50.823", 
	"SOME_UUID2", 1, 0, 0);

INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (1, 1, "Because it give students the correct amount of problem-solving and artistic pieces");
INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (1, 3, "I think I'd use the art to provide more 'emotionally' telling stories");
INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (2, 2, "Yeah, you can name variables whatever you want");
INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (2, 3, "Because it makes it look cooler");