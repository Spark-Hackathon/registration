require('dotenv').config({
	path: __dirname + "/.env"
});
const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

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
			if (err || camper_info.length == 0) console.log(err);
			let camper_obj = {};
			camper_obj.first_name = camper_info[0].first_name;
			camper_obj.last = camper_info[0].last_name;
			camper_obj.weeks = [];
			connection.query("SELECT title, person_loc, approved FROM week INNER JOIN enrollment ON week.id = enrollment.week_id WHERE camper_id=?", camper_info[0].id, (err, camper_week_info) => {
				if (err) reject(err);
				if (!camper_week_info || !camper_week_info.length) reject("No enrollment values");
				let med_forms_required = false;
				let consent_required = false;
				camper_week_info.forEach((item, index) => {
					consent_required = item.approved == 1 ? true : false;
					med_forms_required = (item.person_loc == 1 && consent_required) ? true : false;
					camper_obj.weeks.push({ title: item.title, person_loc: item.person_loc, approved: item.approved });
				});
				// resolve what needs to be completed for each form: if both med and consent count are already 1, then every one of the boxes is checked, otherwise, need to do much more researching
				camper_obj.showing_consent_option = consent_required ? 1 : 0;
				camper_obj.consent_completion = camper_info[0].consent == 1 ? 1 : 0;
				camper_obj.showing_med_option = med_forms_required ? 1 : 0;
				camper_obj.med_completion = camper_info[0].med == 1 ? 1 : 0;
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
	let return_obj = {};
	//cross-check the id with db
	try {
		let camper_info = await pull_camper_info(req.query.camper_id);
		res.json(camper_info);
	} catch (error) {
		error.message = "Looks like there was a problem pulling up your registration status, try reloading?";
		next(error);
	}
});

module.exports = client;