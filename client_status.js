require('dotenv').config({
	path: __dirname + "/.env"
});
const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const {
	chunk_encrypt,
	encrypt
} = require("./crypto/encrypt.js");
const client = express.Router();

const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	password: process.env.PASSWORD,
	user: process.env.DB_USER,
	insecureAuth: true
});

connection.connect((err) => {
	if (err) throw err;
});

function pull_camper_info(camper_id) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT id, first_name, last_name, COUNT(medical_forms.camper_id) AS med, COUNT(consent_release.camper_id) AS consent FROM camper LEFT JOIN medical_forms ON camper.id = medical_forms.camper_id LEFT JOIN consent_release ON camper.id = consent_release.camper_id WHERE camper_unique_id=?", camper_id, (err, camper_info) => {
			if (err || camper_info.length == 0) reject(err);
			let camper_obj = {};
			camper_obj.first_name = camper_info[0].first_name;
			camper_obj.last = camper_info[0].last_name;
			camper_obj.weeks = [];
			connection.query("SELECT title, person_loc, approved FROM week INNER JOIN enrollment ON week.id = enrollment.week_id WHERE camper_id=?", camper_info[0].id, (err, camper_week_info) => {
				if (err) reject(err);
				if (!camper_week_info || !camper_week_info.length) reject("No enrollment values");
				let med_forms_required = false;
				let consent_required = false;
				let in_person_value = false;
				camper_week_info.forEach((item, index) => {
					consent_required = (item.approved == 1 || consent_required) ? true : false;
					in_person_value = (item.person_loc == 1 || in_person_value) ? true : false;
					camper_obj.weeks.push({
						title: item.title,
						person_loc: item.person_loc,
						approved: item.approved
					});
				});
				med_forms_required = (consent_required && in_person_value) ? true : false;
				// resolve what needs to be completed for each form: if both med and consent count are already 1, then every one of the boxes is checked, otherwise, need to do much more researching
				camper_obj.showing_consent_option = +consent_required;
				camper_obj.consent_completion = camper_info[0].consent;
				camper_obj.showing_med_option = +med_forms_required;
				camper_obj.med_completion = camper_info[0].med;
				//now run through and see which "forms_need_completion" string to put
				let string = (camper_obj.showing_consent_option && !camper_obj.showing_med_option) ? "consent form" : "forms";
				if (camper_obj.showing_consent_option) camper_obj.forms_need_completion = "Have you completed your " + string + "?";
				if (camper_obj.showing_consent_option && camper_obj.consent_completion == 0 && camper_obj.med_completion == 1) camper_obj.forms_need_completion = "Make sure to complete the complete the consent and release form";
				if (camper_obj.showing_med_option && camper_obj.med_completion == 0 && camper_obj.consent_completion) camper_obj.forms_need_completion = "Have you completed your health form?";
				if (camper_obj.consent_completion && camper_obj.med_completion) camper_obj.forms_need_completion = "Forms all completed! Resubmit form to change health information";
				resolve(camper_obj);
			});
		});
	})
}

client.use(bodyParser.urlencoded({
	extended: false
}));
client.use(bodyParser.json());

client.get("/get-status", async (req, res, next) => {
	//cross-check the id with db
	try {
		let camper_info = await pull_camper_info(req.query.camper_id);
		res.json(camper_info);
	} catch (error) {
		error.message = "Looks like there was a problem pulling up your registration status, try reloading?";
		next(error);
	}
});

function pull_camper_id(unique_id) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT id, approved FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id WHERE camper_unique_id=?", unique_id, (err, camper_id) => {
			if (err) reject(err);
			if (!camper_id || camper_id.length == 0) reject("No camper with the unique id: ", unique_id);
			let approval = false;
			camper_id.forEach((item, index) => {
				approval = (item.approved == 1 || approval) ? true : false;
			});
			if (!approval) reject("The camper specified doesn't need this information submitted");
			resolve(camper_id[0].id);
		});
	});
}

function insert_medical_health_values(query_string, query_questions, camper_values) {
	return new Promise((resolve, reject) => {
		connection.query("INSERT INTO medical_forms " + query_string + " VALUES " + query_questions, camper_values, (err) => {
			if (err) reject(err);
			resolve();
		});
	});
}

client.post("/submit-health-forms", async (req, res, next) => {
	//get data, make new array with all data stored as encrypted version, insert into database
	try {
		let medical_forms_input = [];
		medical_forms_input[0] = await pull_camper_id(req.body.camper_unique_id);
		//start running through the req object to pull all of the fields needed:
		let sorted_medical_info = Object.keys(req.body).sort();
		let db_insertion = " (camper_unique_id";
		let db_questions = " (?";
		for (med_value in sorted_medical_info) {
			if (sorted_medical_info[med_value] != "camper_unique_id" && sorted_medical_info[med_value] != "meds") {
				medical_forms_input.push(req.body[sorted_medical_info[med_value]]);
				db_insertion += ", " + sorted_medical_info[med_value];
				db_questions += ", ?";
			}
			db_insertion += med_value == sorted_medical_info.length - 1 ? ")" : "";
			db_questions += med_value == sorted_medical_info.length - 1 ? ")" : "";
		}
		//run through the medical_forms_input and encrypt them
		for (med in medical_forms_input) {
			medical_forms_input[med + 1] = encrypt(medical_forms_input[med + 1]);
		}
		await insert_medical_health_values(db_insetion, db_questions, medical_forms_input);
	} catch (error) {
		console.error(error);
		error.message = "Looks like submitting the health forms didn't work, try reloading?";
		next(error);
	}
});

module.exports = client;