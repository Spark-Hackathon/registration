DROP DATABASE IF EXISTS registration;
CREATE DATABASE registration;

USE registration;

CREATE TABLE camper (
	id INT NOT NULL AUTO_INCREMENT, 
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
	cb_code VARCHAR(255) NOT NULL,
	inClass_available TINYINT(1) NOT NULL,
	virtual_available TINYINT(1) NOT NULL,
	PRIMARY KEY(id)
);

CREATE TABLE enrollment (
	camper_id INT NOT NULL,
	week_id INT NOT NULL,
	signup_time DATETIME NOT NULL,
	enrollment_code VARCHAR(255) NOT NULL,
	person_loc TINYINT(1) NOT NULL,
	approved TINYINT(1) NOT NULL,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`),
	FOREIGN KEY (`week_id`) REFERENCES week (`id`)
);

CREATE TABLE prospect (
	camper_refer_id INT,
	first_name VARCHAR(255) NOT NULL,
	last_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	unique_retrieval VARCHAR(255) NOT NULL,
	subscribed TINYINT(1) NOT NULL DEFAULT 1,
	FOREIGN KEY (`camper_refer_id`) REFERENCES camper (`id`),
	UNIQUE KEY `unique_prospect` (`first_name`, `last_name`, `email`)
);

CREATE TABLE question_meta (
	id INT NOT NULL AUTO_INCREMENT,
	week_id INT NOT NULL,
	question_text MEDIUMTEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (`week_id`) REFERENCES week (`id`)
);

CREATE TABLE questions (
	camper_id INT NOT NULL,
	question_meta_id INT NOT NULL,
	question_response MEDIUMTEXT,
	FOREIGN KEY (`camper_id`) REFERENCES camper (`id`),
	FOREIGN KEY (`question_meta_id`) REFERENCES question_meta (`id`)
);

CREATE TABLE system_settings (
	name VARCHAR(255) NOT NULL,
	value_int INT,
	value_str VARCHAR(255),
	UNIQUE KEY `system_value` (`name`)
);