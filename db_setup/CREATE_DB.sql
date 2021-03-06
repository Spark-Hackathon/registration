DROP DATABASE IF EXISTS registration;
CREATE DATABASE registration;
USE registration;
CREATE TABLE camper (
	id INT NOT NULL AUTO_INCREMENT,
	camper_unique_id CHAR(36) NOT NULL,
	first_name VARCHAR(255) NOT NULL,
	last_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	dob DATE NOT NULL,
	school VARCHAR(255) NOT NULL,
	grade INT NOT NULL,
	gender VARCHAR(255),
	type VARCHAR(255) NOT NULL,
	race_ethnicity VARCHAR(255),
	hopes_dreams LONGTEXT NOT NULL,
	tshirt_size VARCHAR(20) NOT NULL,
	borrow_laptop TINYINT(1) NOT NULL,
	guardian_name VARCHAR(255) NOT NULL,
	guardian_email VARCHAR(255) NOT NULL,
	guardian_phone BIGINT NOT NULL,
	participated TINYINT(1) NOT NULL,
	PRIMARY KEY(id),
	UNIQUE INDEX `unique_camper` (`first_name`, `last_name`, `email`)
);
CREATE TABLE week (
	id INT NOT NULL AUTO_INCREMENT,
	title VARCHAR(255) NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL,
	inClass_available TINYINT(1) NOT NULL,
	virtual_available TINYINT(1) NOT NULL,
	description LONGTEXT,
	PRIMARY KEY(id),
	UNIQUE INDEX `unique_week` (`title`, `start_date`, `end_date`)
);
CREATE TABLE enrollment (
	camper_id INT NOT NULL,
	week_id INT NOT NULL,
	signup_time DATETIME NOT NULL,
	person_loc TINYINT(1) NOT NULL,
	approved TINYINT(1) NOT NULL,
	approved_time DATETIME,
	confirmed TINYINT(1) NOT NULL,
	campbrain_completion DATETIME,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`) ON DELETE CASCADE,
	FOREIGN KEY (`week_id`) REFERENCES week (`id`) ON DELETE CASCADE,
	UNIQUE INDEX `unique_enrollment` (`camper_id`, `week_id`)
);
CREATE TABLE prospect (
	camper_refer_id INT,
	name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	subscribed TINYINT(1) NOT NULL DEFAULT 1,
	FOREIGN KEY (`camper_refer_id`) REFERENCES camper (`id`) ON DELETE CASCADE,
	UNIQUE KEY `unique_prospect_email` (`email`),
	UNIQUE KEY `unique_prospect_name` (`name`)
);
CREATE TABLE question_meta (
	id INT NOT NULL AUTO_INCREMENT,
	week_id INT NOT NULL,
	question_text MEDIUMTEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (`week_id`) REFERENCES week (`id`) ON DELETE CASCADE
);
CREATE TABLE questions (
	camper_id INT NOT NULL,
	question_meta_id INT NOT NULL,
	question_response MEDIUMTEXT,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`) ON DELETE CASCADE,
	FOREIGN KEY (`question_meta_id`) REFERENCES question_meta (`id`) ON DELETE CASCADE
);
CREATE TABLE system_settings (
	name VARCHAR(255) NOT NULL,
	value_int INT,
	value_str VARCHAR(255)
);
CREATE TABLE medical_forms (
	camper_id INT NOT NULL,
	allergies_text LONGTEXT,
	epi_pen_info LONGTEXT,
	dietary_restrictions LONGTEXT,
	otc_acetaminophen LONGTEXT,
	otc_antihistamines LONGTEXT,
	otc_aspirin LONGTEXT,
	otc_sunscreen LONGTEXT,
	otc_notes LONGTEXT,
	health_history LONGTEXT,
	doctor_name LONGTEXT,
	doctor_phone LONGTEXT,
	insurance LONGTEXT,
	insurance_holder LONGTEXT,
	insurance_company LONGTEXT,
	insurance_group LONGTEXT,
	insurance_policy LONGTEXT,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`) ON DELETE CASCADE
);
CREATE TABLE meds(
	camper_id INT NOT NULL,
	medication_name LONGTEXT,
	medication_dosage LONGTEXT,
	medication_notes LONGTEXT,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`) ON DELETE CASCADE
);