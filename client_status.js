require('dotenv').config({
	path: __dirname + "/.env"
});
const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const {
	connection,
	getDate
} = require("./utils");

const {
	chunk_encrypt,
	encrypt
} = require("./crypto/encrypt.js");
const client = express.Router();

function pull_id(unique_id) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT id FROM camper WHERE camper_unique_id=?", unique_id, (err, camper_id) => {
			if (err) return reject(err);
			if (!camper_id || !camper_id.length) return reject("No camper under the specified ID", err);
			resolve(camper_id[0].id);
		});
	});
}

client.post("/un-enroll-week", async (req, res, next) => {
	try {
		let camper_id = await pull_id(req.body.unique_id);
		//now delete the enrollment value in the camper
		await new Promise((resolve, reject) => {
			connection.query("DELETE FROM enrollment WHERE camper_id=? AND week_id=?", [camper_id, req.body.week_id], (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
		res.redirect("/get-status?unique_id=" + req.body.unique_id);
	} catch (error) {
		error.message = "Something went wrong trying to un-enroll, try reloading?";
		next(error);
	}
});

client.post("/change-person-loc", async (req, res, next) => {
	try {
		let camper_id = await pull_id(req.body.unique_id);
		await new Promise((resolve, reject) => {
			connection.query("SELECT person_loc FROM enrollment WHERE camper_id=? AND week_id=?", [camper_id, req.body.week_id], (err, person_loc) => {
				if (err) return reject(err);
				person_loc[0].person_loc = person_loc[0].person_loc == 1 ? 0 : 1;
				connection.query("UPDATE enrollment SET person_loc=? WHERE camper_id=? AND week_id=?", [person_loc[0].person_loc, camper_id, req.body.week_id], (err) => {
					if (err) return reject(err);
					resolve();
				});
			});
		});
		res.redirect("/get-status?unique_id=" + req.body.unique_id);
	} catch (error) {
		error.message = "Looks like changing your location didn't work";
		next(error);
	}
});

function pull_camper_info(unique_id) {
	console.log(unique_id);
	return new Promise((resolve, reject) => {
		connection.query("SELECT id, first_name, last_name, COUNT(medical_forms.camper_id) AS med, COUNT(consent_release.camper_id) AS consent FROM camper " +
			"LEFT JOIN medical_forms ON camper.id = medical_forms.camper_id LEFT JOIN consent_release ON camper.id = consent_release.camper_id WHERE camper.camper_unique_id=?", unique_id, (err, camper_info) => {
				if (err) {
					if (err.errno == 1064) return resolve('no_unique_id');
					console.log(err);
					return reject(err);
				}
				if (!camper_info || !camper_info.length || camper_info[0].id == undefined) reject("No camper under the specified value");
				let camper_obj = {};
				camper_obj.camper_id = camper_info[0].id;
				camper_obj.first_name = camper_info[0].first_name;
				camper_obj.last_name = camper_info[0].last_name;
				camper_obj.weeks = [];
				connection.query("SELECT title, person_loc, approved FROM week INNER JOIN enrollment ON week.id = enrollment.week_id WHERE camper_id=?", camper_info[0].id, (err, camper_week_info) => {
					if (err) return reject(err);
					if (!camper_week_info || !camper_week_info.length) return reject("No enrollment values");
					let med_forms_required = false;
					let consent_required = false;
					let in_person_value = false;
					camper_week_info.forEach((item, index) => {
						consent_required = (item.approved == 1 || consent_required) ? true : false;
						in_person_value = (item.person_loc == 1 || in_person_value) ? true : false;
						let person_loc_bool = item.person_loc == 1 ? true : false;
						let approved_bool = item.approved == 1 ? true : false;
						camper_obj.weeks.push({
							title: item.title,
							person_loc: person_loc_bool,
							approved: approved_bool
						});
					});
					med_forms_required = (consent_required && in_person_value) ? true : false;
					// resolve what needs to be completed for each form: if both med and consent count are already 1, then every one of the boxes is checked, otherwise, need to do much more researching
					camper_obj.showing_consent_option = +consent_required;
					camper_obj.showing_consent_option = camper_obj.showing_consent_option == 1 ? true : false;
					camper_obj.consent_completion = camper_info[0].consent;
					camper_obj.consent_completion = camper_obj.consent_completion == 1 ? true : false;
					camper_obj.showing_med_option = +med_forms_required;
					camper_obj.showing_med_option = camper_obj.showing_med_option == 1 ? true : false;
					camper_obj.med_completion = camper_info[0].med;
					camper_obj.med_completion = camper_obj.med_completion == 1 ? true : false;
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
		let camper_info = await pull_camper_info(req.query.unique_id);
		console.log(camper_info);
		if (camper_info == 'no_unique_id') {
			return res.redirect('/status-page');
		}
		res.render("status", {
			title: `Status — Summer ${getDate()}`,
			year: getDate(),
			camper_info
		});
	} catch (error) {
		error.message = "Looks like there was a problem pulling up your registration status, try reloading?";
		next(error);
	}
});

function pull_camper_id(unique_id, need_location) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT id, approved, person_loc FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id WHERE camper.camper_unique_id=?", unique_id, (err, camper_id) => {
			if (err) return reject(err);
			if (!camper_id || camper_id.length == 0) return reject("No camper with the unique id: ", unique_id);
			let approval = false;
			let person_loc = false; //if this is false, then we don't need medical information
			if (need_location == 0) {
				person_loc = true;
				camper_id.forEach((item, index) => {
					approval = (item.approved == 1 || approval) ? true : false;
				});
			} else {
				camper_id.forEach((item, index) => {
					approval = (item.approved == 1 || approval) ? true : false;
					person_loc = (item.person_loc == 1 || person_loc) ? true : false;
				});
			}
			if (!approval || !person_loc) return reject("The camper specified doesn't need this information submitted");
			resolve(camper_id[0].id);
		});
	});
}

function insert_medical_health_values(camper_id, query_string, query_questions, query_update, camper_values) {
	return new Promise((resolve, reject) => {
		camper_values = camper_values.concat(camper_values);
		connection.query(query_string + query_questions + query_update, camper_values, (err) => {
			if (err) return reject(err);
			resolve();
		});
	});
}

client.post("/submit-health-forms", async (req, res, next) => {
	//get data, make new array with all data stored as encrypted version, insert into database
	try {
		let medical_forms_input = [];
		let med_values = {};
		let meds = [];
		let save_unique_id = req.body.unique_id;
		await new Promise(async (resolve, reject) => {
			let insert_statement = "INSERT INTO medical_forms (";
			let value_statement = " VALUES (";
			let update_statement = " ON DUPLICATE KEY UPDATE ";
			let index_counter = 0;
			req.body.unique_id = await pull_camper_id(req.body.unique_id, 1);
			Object.keys(req.body).forEach(async (item, index) => {
				if (item.substring(item.length - 15) != "medication_name" &&
					item.substring(item.length - 17) != "medication_dosage" &&
					item.substring(item.length - 16) != "medication_times" &&
					item.substring(item.length - 16) != "medication_notes") {
					if (item == "wavier_accept") {
						if (req.body[item] == "0") return reject(1);
					} else if (item == "covid_accept") {
						if (req.body[item] == "0") return reject(2);
					} else {
						index_counter++;
						let comma = index_counter == 17 ? ")" : ", ";
						let item_name = item == "allergies" ? "allergies_text" : item;
						item_name = item == "epipen" ? "epi_pen_info" : item_name;
						item_name = item == "unique_id" ? "camper_id" : item_name;
						insert_statement += item_name + comma;
						value_statement += "?" + comma;
						comma = comma == ")" ? "" : comma;
						update_statement += item_name + "=?" + comma;
						let med_value = req.body[item] == "1" ? "yes" : "no";
						req.body[item] = (med_value == "yes" || med_value == "no") && (req.body[item] == "1" || req.body[item] == "0") ? med_value : req.body[item];
						req.body[item] = req.body[item].toString().length ? req.body[item] : "none";
						medical_forms_input.push(req.body[item]);
					}
				} else {
					// Figure out which one you are trying to add
					if (item.substring(item.length - 15) == "medication_name") {
						if (typeof med_values[item.substring(0, item.length - 16)] == "undefined")
							med_values[item.substring(0, item.length - 16)] = {};
						med_values[item.substring(0, item.length - 16)] = { ...med_values[item.substring(0, item.length - 16)],
							...{
								medication_name: req.body[item]
							}
						};
					} else if (item.substring(item.length - 17) == "medication_dosage") {
						if (typeof med_values[item.substring(0, item.length - 18)] == "undefined")
							med_values[item.substring(0, item.length - 18)] = {};
						med_values[item.substring(0, item.length - 18)] = { ...med_values[item.substring(0, item.length - 18)],
							...{
								medication_dosage: req.body[item]
							}
						};
					} else if (item.substring(item.length - 16) == "medication_times") {
						if (typeof med_values[item.substring(0, item.length - 17)] == "undefined")
							med_values[item.substring(0, item.length - 17)] = {};
						med_values[item.substring(0, item.length - 17)] = { ...med_values[item.substring(0, item.length - 17)],
							...{
								medication_times: req.body[item]
							}
						};
					} else {
						if (typeof med_values[item.substring(0, item.length - 17)] == "undefined")
							med_values[item.substring(0, item.length - 17)] = {};
						med_values[item.substring(0, item.length - 17)] = { ...med_values[item.substring(0, item.length - 17)],
							...{
								medication_notes: req.body[item]
							}
						};
					}
				}
			});
			console.log(medical_forms_input);
			for (let med = 1; med < medical_forms_input.length; med++) {
				medical_forms_input[med] = encrypt(medical_forms_input[med]);
			}
			await insert_medical_health_values(medical_forms_input[0], insert_statement, value_statement, update_statement, medical_forms_input);
			//go through meds and encrypt them
			Object.keys(med_values).forEach((item, index) => {
				meds[index] = [];
				Object.keys(med_values[item]).forEach((med, ind) => {
					meds[index][ind] = encrypt(med_values[item][med]);
				});
				meds[index] = [req.body.unique_id].concat(meds[index]);
			});
			resolve();
		});
		try {
			let final_meds_query = await new Promise((outer_resolve, outer_reject) => {
				connection.query("DELETE FROM meds WHERE camper_id=?", medical_forms_input[0], async (err) => {
					if (err) return outer_reject(err);
					let insertion_med = meds.map((item, index) => {
						return new Promise((resolve, reject) => {
							connection.query("INSERT INTO meds VALUES (?, ?, ?, ?, ?)", item, (err) => {
								if (err) return reject(err);
								resolve();
							});
						});
					});
					await Promise.all(insertion_med).then(() => {
						outer_resolve();
					}).catch((error) => {
						return outer_reject(error);
					});
				});
			});
			//then put in the camper_unique_id to redirect to the get-status page of that user
			res.redirect("/get-status?unique_id=" + save_unique_id);
		} catch (error) {
			throw error;
		}
	} catch (error) {
		error = {
			mainload: error
		};
		error.message = error.mainload == 1 ? "You must accept the wavier to submit. Press back and alter the form, then resubmit." : error.mainload == 2 ?
			"You must accept the COVID-19 Protocols to submit. Press back and alter the form, then resubmit." :
			"Looks like submitting the health forms didn't work, try reloading?";
		next(error);
	}
});

client.post("/consent-and-release", async (req, res, next) => {
	try {
		let camper_id = await pull_camper_id(req.body.unique_id, 0);
		let safety_net = await new Promise(async (resolve, reject) => {
			connection.query("INSERT INTO consent_release (camper_id, completion_time) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE completion_time=NOW()", [camper_id], (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
		res.redirect("/get-status?unique_id=" + req.body.unique_id);
	} catch (error) {
		error.message = "Submitting the consent form didn't work... try reloading?";
		next(error);
	}
});

client.get("/pull-url/:id", (req, res) => {
	connection.query("SELECT camper_unique_id FROM camper WHERE id=?", req.params.id, (err, unique_id) => {
		if (err) return res.end(err.toString());
		if (!unique_id.length) return res.end("No camper with specified id");
		return res.end("<a href='" + process.env.CURRENT_URL + "get-status?unique_id=" + unique_id[0].camper_unique_id + "'>Camper's UUID: " + unique_id[0].camper_unique_id + "</a>");
	});
});

client.post("/redirect-status-page", async (req, res, next) => {
	try {
		// using req.body.first_name, req.body.last_name, req.body.email
		await new Promise((resolve, reject) => {
			connection.query("SELECT camper_unique_id FROM camper WHERE first_name=? AND last_name=? AND email=?", [req.body.first_name, req.body.last_name, req.body.email], (err, rows) => {
				if (err) return reject(err);
				if (!rows.length) return reject("No camper with specified information");
				res.redirect("/get-status?unique_id=" + rows[0].camper_unique_id);
			});
		});
	} catch (error) {
		error.message = "Something went wrong signing in"
	}
});

module.exports = client;