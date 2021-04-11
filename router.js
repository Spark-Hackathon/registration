const bodyParser = require("body-parser");
const nodemail = require("nodemailer");
const sendmail = require("sendmail");
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const Joi = require("joi");
const fs = require("fs");

const {
	getDate
} = require("./utils");
const {
	sheet
} = require("./googletest/sheeter.js");

const type_meta = {
	designer: 0,
	artist: 1,
	researcher: 2,
	engineer: 3,
	writer: 4,
	leader: 5,
	none: 6
};

const router = express.Router();
const {
	v4: uuidv4
} = require("uuid");

let transporter = nodemail.createTransport({
	sendmail: true,
	newline: 'unix',
	path: '/usr/sbin/sendmail'
});

//connect to db
let connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	password: process.env.PASSWORD,
	user: process.env.DB_USER,
	insecureAuth: true
});

connection.connect((err) => {
	if (err) throw err;
});

let week_meta;
connection.query("SELECT * FROM week", (err, row) => {
	if (err) console.log(err);
	let pre_week = new Map();
	for (row_number in row) {
		pre_week.set(row[row_number].title, {
			id: row[row_number].id,
			inclass_available: row[row_number].inClass_available,
			virtual_available: row[row_number].virtual_available,
			cb_code: row[row_number].cd_code,
			start_date: row[row_number].start_date,
			end_date: row[row_number].end_date,
			description: row[row_number].description,
		});
	}
	week_meta = pre_week;
});

router.use(bodyParser.urlencoded({
	extended: false
}));
router.use(bodyParser.json());

function admin_validate(code) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, admin_code) => {
			if (err) reject(err);
			if (code != admin_code[0].value_str) reject("Authentication failure");
			resolve(true);
		});
	});
}

function full_sendmail(to, subject, text, replacement) {
	if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(to)) return false; 
	console.log("send mail", to, subject, text, replacement);
	Object.keys(replacement).forEach((item, index) => {
		let string = "{{" + item.toUpperCase() + "}}";
		string = replacement[item] == "" ? " " + string : string;
		let replacer = new RegExp(string, "g");
		text = text.replace(replacer, replacement[item]);
	});
	console.log(text);
	return new Promise((transport_resolve, transport_reject) => {
		transporter.sendMail({
			from: '"Summer Spark ' + getDate() + '"<spark' + getDate().substring(1) + '@cs.stab.org>',
			replyTo: 'spark@stab.org',
			to: to,
			subject: subject,
			html: text
		}, (err, info) => {
			if (err) {
				err.send_mail_info = info;
				transport_reject(err);
			}
			transport_resolve(info);
		});
	});
}

router.use(bodyParser.urlencoded({
	extended: false
}));
router.use(bodyParser.json());

const basic_schema = Joi.object({
	first_name: Joi.string().min(1).max(255).required(),
	last_name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	updates: Joi.number().max(1)
});

//joi prospect schema
const camper_schema = Joi.object({
	first_name: Joi.string().min(1).max(255).required(),
	last_name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	dob: Joi.date().max("2015-01-01").required(),
	school: Joi.string().min(1).max(255).required(),
	grade: Joi.number().min(10).max(18).required(),
	gender: Joi.string().min(1).max(255).required(),
	type: Joi.string().min(5).max(255).lowercase().required(), //change for the type object
	race_ethnicity: Joi.string().required(),
	hopes_dreams: Joi.string().min(50).required(),
	tshirt_size: Joi.string().min(1).max(20).required(),
	borrow_laptop: Joi.number().max(1).default(0),
	guardian_name: Joi.string().min(1).max(255).required(),
	guardian_email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	participated: Joi.number().max(1).required(),
});

let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

router.get("/open-weeks", (req, res) => {
	let week_data = [];
	for (let [key, value] of week_meta) {
		let inner = {};
		inner.id = value.id;
		inner.title = key;
		inner.start_date = months[parseInt(new Date(value.start_date).toLocaleDateString('en-US').split("/")[0], 10) - 1] + " " + new Date(value.start_date).toLocaleDateString('en-US').split("/")[1];
		inner.end_date = months[parseInt(new Date(value.end_date).toLocaleDateString('en-US').split("/")[0], 10) - 1] + " " + new Date(value.end_date).toLocaleDateString('en-US').split("/")[1];
		inner.inclass_available = value.inclass_available;
		inner.virtual_available = value.inclass_available;
		inner.description = value.description;
		week_data.push(inner);
	};
	res.json(week_data);
});

const referral_schema = Joi.object({
	name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required()
});

router.post("/camper-register-queueing", async (req, res, next) => {
	try {
		let camper_register = await new Promise((resolve, reject) => {
			if (!camper_schema.validate(req.body)) reject(camper_schema.validate(req.body).error);
			let item = req.body;
			item.type = type_meta[item.type];
			connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], (err, pre_id) => {
				if (err) reject(err);
				let camper_writeup;
				let extra_camper_info = [];
				item.guardian_number = item.guardian_number.replace(/[^0-9]/g, "");
				item.guardian_number = item.guardian_number.length == 0 ? "0" : item.guardian_number;
				item.guardian_number = parseInt(item.guardian_number, 10);
				item.dob = new Date(item.dob);
				item.dob.setTime(item.dob.getTime() + (item.dob.getHours()*60*60*1000));
				item.dob = [item.dob.getFullYear(), item.dob.getMonth() + 1, item.dob.getDate()].join("-");
				extra_camper_info.push(item.first_name, item.last_name, item.email, item.dob, item.school, item.grade, item.gender, item.type, item.race_ethnicity,
					item.hopes, item.tshirt_size, item.borrow_laptop, item.guardian_name, item.guardian_email, item.guardian_number, item.participated);
				if (pre_id && pre_id.length) {
					camper_writeup = "UPDATE camper SET first_name=?, last_name=?, email=?, dob=?, school=?, grade=?, gender=?, type=?, race_ethnicity=?, " +
						"hopes_dreams=?, tshirt_size=?, borrow_laptop=?, guardian_name=?, guardian_email=?, guardian_phone=?, participated=? WHERE first_name=? AND last_name=? AND email=?";
					extra_camper_info.push(item.first_name, item.last_name, item.email);
				} else {
					let new_uuid = uuidv4();
					camper_writeup = "INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, " +
						"hopes_dreams, tshirt_size, borrow_laptop, guardian_name, guardian_email, guardian_phone, participated, camper_unique_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
					extra_camper_info.push(new_uuid);
				}
				// add them to the camper database, then enrollment based on their weeks
				console.log("\nTEST", camper_writeup, extra_camper_info);
				connection.query(camper_writeup, extra_camper_info, async (err) => {
					if (err) return reject(err);
					connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], async (err, camper_id) => {
						if (err) return reject(err);
						//insert for each week they signed up for
						let dead_weeks = [],
							dead_count = 0;
						let weeks = [],
							count = 0;
						week_meta.forEach((week, index) => {
							if (item[week.id + "-status"] > 0) {
								weeks[count] = [];
								weeks[count][0] = week.id;
								weeks[count][1] = item[week.id + "-status"];
								count++;
							} else {
								dead_weeks[dead_count] = week.id;
								dead_count++;
							}
						});
						async function enrollmentInsert(week) {
							return new Promise((enroll_resolve, enroll_reject) => {
								let loc = parseInt(week[1], 10);
								connection.query("SELECT approved FROM enrollment WHERE week_id=? AND camper_id=?", [week[0], camper_id[0].id], (err, camper_enroll_value) => {
									if (err) return enroll_reject(err);
									let approved_value = camper_enroll_value && camper_enroll_value.length && camper_enroll_value[0].approved == 1 ? 1 : 0;
									connection.query("INSERT INTO enrollment (camper_id, week_id, signup_time, person_loc, approved) VALUES " +
										"(?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE signup_time=?, person_loc=?, approved=?", [camper_id[0].id, week[0], new Date(), loc  - 1, 0, new Date(), week[1] - 1, approved_value], (err) => {
											if (err) return enroll_reject(err);
											connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", week[0], (err, questions) => {
												if (err) return enroll_reject(err);
												if (questions.length) enroll_resolve(questions);
												enroll_resolve([]);
											});
										});
								});
							});
						}
						let questions = [];
						let question_position = 0;
						if (weeks.length == 0) reject("no camper value");
						try {
							await new Promise(async (enrolling_resolve, enrolling_reject) => {
								let all_kills = dead_weeks.map((item, index) => {
									return new Promise((kill_values_resolve, kill_values_reject) => {
										connection.query("DELETE FROM enrollment WHERE week_id=? AND camper_id=?", [item, camper_id[0].id], (err) => {
											if (err) kill_values_reject(err);
											kill_values_resolve();
										});
									});
								});
								await Promise.all(all_kills);
								for (let weeks_db = 0; weeks_db < weeks.length; weeks_db++) {
									let any_questions = await enrollmentInsert(weeks[weeks_db], 0);
									//each week sends back questions for the specific person - need to build up an array
									for (let question = 0; question < any_questions.length; question++) {
										questions[question_position] = {
											question_text: any_questions[question].question_text,
											id: any_questions[question].id
										}
										question_position++;
									}
								}
								let user_data = {};
								if (item.refer_name && item.refer_email) {
									user_data.refer_id = camper_id[0].id;
									user_data.name = item.refer_name;
									user_data.email = item.refer_email;
									user_data.correlation = 1;
									if (referral_schema.validate(user_data) && user_data.correlation == 1) {
										await prospectSignup(user_data);
									} else {
										enrolling_reject(referral_schema.validate(user_data).error);
									}
								}
								let registration_file = fs.readFileSync(path.join(__dirname, "emailTemplates", "camper_registration")).toString();
								let email_obj = {
									first_name: item.first_name,
									last_name: item.last_name
								};
								console.log(await full_sendmail(item.email, "You've applied!", registration_file, email_obj));
								connection.query("DELETE FROM prospect WHERE email=?", item.email, (err) => {
									if (err) enrolling_reject(err);
									enrolling_resolve(res.render("question.hbs", {
										title: `Application Questions – Summer Spark ${getDate()}`,
										year: getDate(),
										camper_id: camper_id[0].id,
										questions: questions
									}));
								});
							});
						} catch (error) {
							return reject(error);
						}
					});
				});
			});
		});
	} catch (error) {
		error.message = "Looks like there was an error applying, try reloading?";
		next(error);
	}
});

router.post("/camper-submit-questions", async (req, res, next) => {
	try {
		connection.query("DELETE FROM questions WHERE camper_id=?", req.body.camper_id, async (err) => {
			if (err) {
				err.message = "Hmm... submitting these questions didn't work, try reloading?";
				next(err);
			}
			if (!req.body.responses.length) res.end();
			let all_responses = req.body.responses.map((item, index) => {
				return new Promise((resolve, reject) => {
					connection.query("INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (?, ?, ?)", [req.body.camper_id, item.question_id, item.response], (err) => {
						if (err) reject(err);
						resolve(1);
					});
				});
			});
			await Promise.all(all_responses);
			res.end();
		});
	} catch (error) {
		error.message = "Hmm... submitting these questions didn't work, try reloading?";
		next(error);
	}
});

router.post("/signup-prospect", async (req, res, next) => {
	try {
		if (!referral_schema.validate(req.body)) throw pros_schema.validate(user_data).error;
		console.log("PREPARE INSERTION");
		await prospectSignup(req.body);
		let email_obj = {};
		let email_text = fs.readFileSync(path.join(__dirname, "emailTemplates", "prospect_signedup")).toString();
		let split_name = req.body.name.trim().split(" ");
		email_obj.first_name = split_name[0];
		email_obj.last_name = split_name[0] == split_name[split_name.length - 1] ? "" : split_name[split_name.length - 1];
		email_obj.url = "If you ever want to unsubscribe, go to this link: " + process.env.CURRENT_URL + "unsubscribe";
		await full_sendmail(req.body.email, "You've signed up for updates!", email_text, email_obj);
		res.redirect("/updates/thank-you");
	} catch (error) {
		error.message = "Hmm... Looks like signing up didn't work, try reloading?";
		if (error.code == 'ER_DUP_ENTRY') error.message = "This email is already connected to another user, try picking a different one, or get in contact with us";
		if (error.code == 'ER_DATA_TOO_LONG') error.message = "Your name or email was to long, try a shorter one";
		next(error);
	}
});

// this will work for all the needed inserts into prospect, just change subscribed
function prospectSignup(user_data) {
	return new Promise((resolve, reject) => {
		let build = "INSERT INTO prospect (name, email, subscribed) VALUES (?, ?, ?)";
		let array_build = [user_data.name, user_data.email, 1];
		if (user_data.refer_id) {
			build = "INSERT INTO prospect (name, email, subscribed, camper_refer_id) VALUES (?, ?, ?, ?)";
			array_build.push(user_data.refer_id);
		}
		build += " ON DUPLICATE KEY UPDATE subscribed=1";
		connection.query(build, array_build, (err) => {
			if (err) reject(err);
			resolve();
		});
	});
}

const unsubscribe_schema = Joi.object({
	email: Joi.string().email().required()
});

router.post("/unsubscribe", (req, res, next) => {
	try {
		if (unsubscribe_schema.validate(req.body)) {
			connection.query("SELECT * FROM prospect WHERE email=?", req.body.email, (err, prospect_info) => {
				if (err) throw err;
				if (prospect_info.length) {
					connection.query("UPDATE prospect SET subscribed=0 WHERE email=?", req.body.email, (err) => {
						if (err) throw err;
						res.render("thank_you_unsubscribe");
					});
				} else {
					res.render("error", {
						error: "Uh oh... That email didn't exist",
						show_apply: true
					});
				}
			});
		} else {
			throw unsubscribe_schema.validate(req.body).error;
		}
	} catch (error) {
		error.message = "Unsubscribing failed, maybe try reloading?";
		next(error);
	}
});

router.post("/admin/get-weeks", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let weeks = [];
		let count = 0;
		week_meta.forEach((week, index) => {
			weeks[count] = {
				name: index,
				week_id: week.id,
				inclass_available: week.inclass_available,
				virtual_available: week.virtual_available
			};
			count++;
		});
		res.json(weeks);
	} catch (error) {
		error.message = "Hmm.. Looks like getting weeks didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/get-campers-link", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		await new Promise((resolve, reject) => {
			connection.query("SELECT first_name, last_name, email, camper_unique_id FROM camper ORDER BY last_name, first_name, email ASC", (err, unique_id) => {
				if (err) reject(err);
				let camper_obj = "";
				unique_id.forEach((item, index) => {
					camper_obj += "<p> " + item.first_name + " " + item.last_name + " " + item.email + ": " + "camper link".link(process.env.CURRENT_URL + "get-status?camper_id=" + unique_id[0].camper_unique_id) + "</p>";
				});
				res.end(camper_obj);
			});
		});
	} catch (error) {
		error.message = "Getting the formlink didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/delete-week", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let obj = {
			week_question: []
		};
		connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", req.body.id, async (err, question_meta_info) => {
			if (err) throw err;
			async function pull_questions(id) {
				return new Promise((resolve, reject) => {
					connection.query("SELECT first_name, last_name, question_response FROM questions INNER JOIN camper ON questions.camper_id = camper.id WHERE question_meta_id=?", id, (err, question_res) => {
						if (err) reject(err);
						resolve(question_res);
					});
				});
			}
			if (question_meta_info.length) {
				question_meta_info.forEach(async (item, index) => {
					let questions = await pull_questions(item.id);
					obj.week_question.push({
						question_text: item.question_text,
						question_answer: []
					});
					questions.forEach((question, ind) => {
						obj.week_question[index].question_answer.push({
							camper_name: question.first_name + " " + question.last_name,
							response: question.question_response
						});
					});
					if (obj.week_question.length == question_meta_info.length) {
						//grab all of the info for the questions about this week, drop that and make it into an obj to send to user
						connection.query("DELETE FROM week WHERE id=?", req.body.id, (err) => {
							if (err) throw err;
							week_meta.delete(code[0].title);
							res.json(obj);
						});
					}
				});
			} else {
				connection.query("DELETE FROM week WHERE id=?", req.body.id, (err) => {
					if (err) throw err;
					week_meta.delete(code[0].title);
					res.end();
				});
			}
		});
	} catch (error) {
		error.message = "Hmm... Looks like deleting week didn't work, try reloading?";
		next(error);
	}
});

const add_week_schema = Joi.object({
	code: Joi.string().length(36).required(),
	week_name: Joi.string().max(255).required(),
	start_date: Joi.date().min("2015-01-01").required(),
	end_date: Joi.date().min("2015-01-01").required(),
	inclass_available: Joi.number().min(1).max(1).required(),
	virtual_available: Joi.number().min(1).max(1).required()
});

router.post("/admin/add-week", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		if (!add_week_schema.validate(req.body)) throw add_week_schema.validate(req.body).error;
		connection.query("INSERT INTO week (title, start_date, end_date, inClass_available, virtual_available) VALUES (?, ?, ?, ?, ?)", [req.body.week_name, req.body.start_date, req.body.end_date, req.body.inclass_available, req.body.virtual_available], (err) => {
			if (err) throw err;
			connection.query("SELECT id FROM week WHERE title=? AND start_date=? AND end_date=?", [req.body.week_name, req.body.start_date, req.body.end_date], (err, row) => {
				if (err) throw err;
				week_meta.set(req.body.week_name, {
					id: row[0].id,
					inclass_available: req.body.inclass_available,
					virtual_available: req.body.virtual_available,
					start_date: req.body.start_date,
					end_date: req.body.end_date
				});
				res.end();
			});
		});
	} catch (error) {
		error.message = "Failure to add the week " + req.body.week_name;
		next(error);
	}
});

router.post("/admin/get-questions", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		connection.query("SELECT COUNT(id) AS question_count FROM question_meta", (err, question_length) => {
			if (err) throw err;
			let question_obj = [];
			async function pull_questions(week_name, week_id) {
				return new Promise((resolve, reject) => {
					async function pull_responses(question_meta_id) {
						return new Promise((resolve_res, reject_rej) => {
							connection.query("SELECT first_name, last_name, camper_id, question_response FROM questions INNER JOIN camper ON questions.camper_id = camper.id WHERE question_meta_id=?", question_meta_id, (err, response) => {
								if (err) reject_res(err);
								resolve_res(response);
							});
						});
					}
					connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", week_id, async (err, question_meta_info) => {
						if (err) reject(err);
						let inner_full = [];
						if (question_meta_info.length >= 1) {
							question_meta_info.forEach(async (question, index) => {
								try {
									let responses = await pull_responses(question.id);
									let inner = {};
									inner.week = week_name;
									inner.id = question.id;
									inner.question = question.question_text;
									inner.responses = [];
									responses.forEach((response, response_index) => {
										inner.responses.push({
											id: response.camper_id,
											response: response.first_name + " " + response.last_name + " (" + response.camper_id + "): " + response.question_response
										});
									});
									inner_full.push(inner);
									if (index == question_meta_info.length - 1) {
										resolve(inner_full);
									}
								} catch (error) {
									reject(error);
								}
							});
						} else {
							resolve(1);
						}
					});
				});
			}
			let questions = [];
			let count = -1;
			week_meta.forEach(async (week, index) => {
				try {
					let inner_array = await pull_questions(index, week.id);
					if (inner_array != 1) {
						for (num in inner_array) {
							questions.push(inner_array[num]);
						}
					}
					count++;
					if (count == week_meta.size - 1) {
						res.json(questions);
					}
				} catch (error) {
					throw error;
				}
			});
		});
	} catch (error) {
		error.message = "Hmm... Looks like adding your question didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/add-question", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let week_id = week_meta.get(req.body.week).id;
		connection.query("INSERT INTO question_meta (week_id, question_text) VALUE (?, ?)", [week_id, req.body.question], (err) => {
			if (err) throw err;
			res.end();
		});
	} catch (error) {
		error.message = "Hmm... Looks like adding your question didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/delete-question", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let week_id = week_meta.get(req.body.week).id;
		connection.query("DELETE FROM question_meta WHERE id=? AND week_id=?", [req.body.id, week_id], (err) => {
			if (err) throw err;
			res.end();
		});
	} catch (error) {
		error.message = "Hmm... Looks like deleting your question didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/delete-response", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		connection.query("DELETE FROM questions WHERE camper_id=? AND question_meta_id=?", [req.body.camper_id, req.body.question_id], (err) => {
			if (err) throw err;
			res.end();
		});
	} catch (error) {
		error.message = "Hmm... Looks like deleting this response didn't work, try reloading?";
		next(error);
	}
});

function quicksort(array, low, high) {
	if (low < high) {
		let pivot = partition(array, low, high);
		array = pivot[1];
		array = quicksort(array, low, pivot[0] - 1);
		array = quicksort(array, pivot[0] + 1, high);
	}
	return array;
}

function partition(array, low, high) {
	let pivot = low;
	let i = high + 1;
	for (let j = high; j > low; j--) {
		if (array[j][0] > array[pivot][0] && i != j) {
			i--;
			let week_buffer = array[i][0];
			let camper_buffer = array[i][1];
			let person_loc_buffer = array[i][2];
			array[i][0] = array[j][0];
			array[i][1] = array[j][1];
			array[i][2] = array[j][2];
			array[j][0] = week_buffer;
			array[j][1] = camper_buffer;
			array[j][2] = person_loc_buffer;
		}
	}
	if (i >= 0) {
		let week_buffer = array[i - 1][0];
		let camper_buffer = array[i - 1][1];
		let person_loc_buffer = array[i - 1][2];
		array[i - 1][0] = array[pivot][0];
		array[i - 1][1] = array[pivot][1];
		array[i - 1][2] = array[pivot][2];
		array[pivot][0] = week_buffer;
		array[pivot][1] = camper_buffer;
		array[pivot][2] = person_loc_buffer;
	}
	return [i - 1, array];
}

router.post("/admin/pull-current-campers", async (req, res, next) => { //ADMIN
	try {
		await admin_validate(req.body.code);
		//throw all currently pending campers - run through and see which ones are still waiting in enrollment
		let camper_obj = { campers: [] };
		await new Promise(async (resolve, reject) => {
			connection.query("SELECT camper_id, week_id, person_loc FROM enrollment WHERE approved=?", req.body['applicants-or-registered'], async (err, camper_initial) => {
				if (err || !camper_initial) return reject(err);
				if (!camper_initial.length) resolve("No campers");
				//run through campers and sort based on weeks
				let camper_build = [];
				for (camp in camper_initial) {
					camper_build[camp] = [];
					camper_build[camp][0] = camper_initial[camp].week_id;
					camper_build[camp][1] = camper_initial[camp].camper_id;
					camper_build[camp][2] = camper_initial[camp].person_loc;
				}
				camper_build = quicksort(camper_build, 0, camper_build.length - 1);
				//run through all the values
				let camper_loop = camper_build.map((item, index) => {
					return new Promise((camper_resolve, camper_reject) => {
						connection.query("SELECT first_name, last_name, type, hopes_dreams, participated, COUNT(medical_forms.camper_id) AS med, COUNT(consent_release.camper_id) AS consent," +
							" title FROM camper LEFT JOIN medical_forms ON camper.id=medical_forms.camper_id LEFT JOIN consent_release ON camper.id=consent_release.camper_id CROSS JOIN week WHERE camper.id=? AND week.id=?", [item[1], item[0]], (err, camper) => {
								if (err || !camper) return camper_reject(err);
								if (!camper.length) return camper_reject("No camper matches");
								//based on person_loc, need to look at med and consent
								let status = camper[0].consent;
								if (item[2]) status = (camper[0].med && camper[0].consent) ? 1 : 0;
								camper_obj.campers.push({
									week: camper[0].title,
									camper_id: item[1],
									first_name: camper[0].first_name,
									last_name: camper[0].last_name,
									type: camper[0].type,
									hopes_dreams: camper[0].hopes_dreams,
									participated: camper[0].participated,
									confirmed: status
								});
								camper_resolve();
							});
					});
				});
				await Promise.all(camper_loop).then(() => {
					resolve();
				}).catch((err) => {
					return reject(err);
				});
			});
		});
		res.json(camper_obj);
	} catch (error) {
		error.message = "Hmm... Looks like selecting the campers didn't work, try reloading?";
		next(error);
	}
});

function ConvertToCSV(objArray) {
	let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
	let str = '';
	for (var i = 0; i < array.length; i++) {
		if (i == 0) {
			let key_line = '';
			Object.keys(array[0]).forEach((item, index) => {
				if (item != '' && index != 0) key_line += ',';
				key_line += item;
			});
			str += key_line + '\r\n';
		}
		let line = '';
		for (let index in array[i]) {
			if (line != '') line += ','
			line += array[i][index];
		}
		str += line + '\r\n';
	}
	return str;
}

router.post("/admin/export/week", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		connection.query("SELECT * FROM camper INNER JOIN enrollment ON enrollment.camper_id = camper.id WHERE enrollment.week_id=?", week_meta.get(req.body.week_name).id, (err, week_campers) => {
			if (err) throw err;
			for (i in week_campers) {
				Object.keys(type_meta).forEach((item, index) => {
					week_campers[i].type = type_meta[item] == week_campers[i].type ? item : week_campers[i].type;
				});
			}
			res.end(ConvertToCSV(week_campers));
		});
	} catch (error) {
		error.message = "Failed to export the campers of " + week_meta.get(req.body.week_name).id;
		next(error);
	}
});

router.post("/admin/export/all", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let query_net = new Promise((resolve, reject) => {
			connection.query("SELECT * FROM camper", (err, all_campers) => {
				if (err) reject(err);
				res.end(ConvertToCSV(all_campers));
			});
		});
		await query_net;
	} catch (error) {
		error.message = "Failed to export all campers";
		next(error);
	}
});

router.post("/admin/sync-sheet", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		await sheet;
		res.end("Go check the sheet!");
	} catch (error) {
		console.error(error);
		error.message = "Failed to sync google-sheets";
		next(error);
	}
});

function application_accept(id, week) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT camper_unique_id, first_name, last_name, email, guardian_name, guardian_email FROM camper WHERE id=?", id, async (err, email_info) => {
			if (err) reject(err);
			if (email_info) {
				let approved_date = new Date();
				connection.query("UPDATE enrollment SET approved=1, approved_time=? WHERE camper_id=? AND week_id=?", [approved_date, id, week_meta.get(week).id], async (err) => {
					if (err) reject(err);
					let apply_camper_file = fs.readFileSync(path.join(__dirname, "emailTemplates", "accepting_camper_app")).toString();
					let email_obj = {
						first_name: email_info[0].first_name,
						last_name: email_info[0].last_name,
						week_name: week,
						url: process.env.CURRENT_URL + "get-status?unique_id=" + email_info[0].camper_unique_id
					};
					await full_sendmail(email_info[0].email, "You were accepted for " + week + " week", apply_camper_file, email_obj);
					let apply_guardian_file = fs.readFileSync(path.join(__dirname, "emailTemplates", "accepting_camper_app_guardian")).toString();
					let split_name = email_info[0].guardian_name.trim().split(" ");
					let latter_name = split_name[0] == split_name[split_name.length - 1] ? "" : split_name[split_name.length - 1];
					email_obj = {
						first_name: split_name[0],
						last_name: latter_name,
						child_name: email_info[0].first_name,
						week_name: week,
						url: process.env.CURRENT_URL + "reg-status?unique_id=" + email_info[0].camper_unique_id
					}
					resolve(await full_sendmail(email_info[0].guardian_email, email_info[0].first_name + " was accepted for " + week + " week", apply_guardian_file, email_obj));
				});
			} else {
				reject();
			}
		});
	});
}

const application_schema = Joi.object({
	code: Joi.string().length(36).required(),
	camper_id: Joi.number().required(),
	week_name: Joi.string().required()
});

router.post("/admin/accept-camper-application", async (req, res, next) => { //ADMIN
	try {
		if (!application_schema.validate(req.body)) throw application_schema.validate(req.body).error;
		await admin_validate(req.body.code);
		let roll_camper_app = await new Promise((resolve, reject) => {
			connection.query("SELECT approved FROM enrollment WHERE camper_id=? AND week_id=?", [req.body.camper_id, week_meta.get(req.body.week_name).id], async (err, approved_status) => {
				if (err) reject(err);
				if (approved_status && approved_status[0].approved == 1) reject("You can't approve a camper that's already approved");
				resolve(await application_accept(req.body.camper_id, req.body.week_name));
			});
		});
		res.end();
	} catch (error) {
		error.message = "Hmm... Looks like accepting the campers didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/delete-enrollment", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let camper_value = await new Promise((resolve, reject) => {
			//check for if their an applicant or a regisered camper
			req.body.week_id = week_meta.get(req.body.week_name).id;
			connection.query("SELECT approved FROM enrollment WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err, approved) => {
				if (err) reject(err);
				if (approved[0].approved == 1) {
					connection.query("UPDATE enrollment SET approved=0 WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err) => {
						if (err) reject(err);
						res.end();
					});
				} else {
					connection.query("DELETE FROM enrollment WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err) => {
						if (err) reject(err);
						res.end();
					});
				}
			});
		});
	} catch (error) {
		error.message = "Hmm... Looks like deleting a camper enrollment didn't work, try reloading?";
		next(error);
	}
});

router.post("/admin/delete-camper", async (req, res, next) => {
	try {
		await admin_validate(req.body.code);
		let camper_value = await new Promise((resolve, reject) => {
			connection.query("SELECT * FROM camper WHERE first_name=? AND last_name=? AND email=?", [req.body.first_name, req.body.last_name, req.body.email], (err, camper_value) => {
				if (err) reject(err);
				connection.query("DELETE FROM camper WHERE first_name=? AND last_name=? AND email=?", [req.body.first_name, req.body.last_name, req.body.email], (err) => {
					if (err) reject(err);
					resolve(camper_value);
				});
			});
		});
		res.json(camper_value);
	} catch (error) {
		error.message = "Hmm... Looks like deleting a camper didn't work, try reloading?";
		next(error);
	}
});

function prospect_query() {
	return new Promise((resolve, reject) => {
		connection.query("SELECT name, email FROM prospect WHERE subscribed=1", (err, prospects) => {
			if (err) throw err;
			let full_obj = [];
			prospects.forEach((item, index) => {
				let split_name = item.name.trim().split(" ");
				let latter_name = split_name[0] == split_name[split_name.length - 1] ? "" : split_name[split_name.length - 1];
				full_obj.push({
					email: item.email,
					first_name: split_name[0],
					last_name: latter_name,
					url: "To unsubscribe, click here: " + process.env.CURRENT_URL + "unsubscribe"
				});
			});
			resolve(full_obj);
		});
	});
}

router.post("/admin/send-mail", async (req, res, next) => { //ADMIN
	try {
		await admin_validate(req.body.code);
		let async_send_mail = await new Promise((resolve, reject) => {
			let all_campers;
			if (req.body.weeks.length == 0) return reject("Missing the weeks value?");
			let week_value = " WHERE (enrollment.week_id=?";
			if (req.body.weeks.length > 1) {
				req.body.weeks.forEach((item, index) => {
					req.body.weeks[index] = week_meta.get(item).id;
					week_value += index < req.body.weeks.length - 1 ? " OR enrollment.week_id=?" : "";
				});
			}
			week_value += ")"
			week_value += req.body.applicants == 1 && req.body.registered == 0 ? " AND approved=0" : "";
			week_value += req.body.registered == 1 && req.body.applicants == 0 ? " AND approved=1" : "";
			connection.query("SELECT DISTINCT camper_unique_id, first_name, last_name, email, guardian_name, guardian_email FROM enrollment INNER JOIN camper ON enrollment.camper_id = camper.id" + week_value, req.body.weeks, async (err, enrolled_info) => {
				if (err) return reject(err);
				//now run through each of the prospects / campers
				let full_email_obj = [];
				if (req.body.prospects == 1) full_email_obj = await prospect_query(req.body.subject, req.body.message);
				if ((req.body.applicants == 1 || req.body.registered == 1) && enrolled_info) {
					enrolled_info.forEach((item, index) => {
						full_email_obj.push({
							email: item.email,
							first_name: item.first_name,
							last_name: item.last_name,
							url: "Check out your week statuses here: " + process.env.CURRENT_URL + "reg-status?camper_id=" + item.camper_unique_id
						});
					});
				}
				if (req.body.guardians == 1) {
					enrolled_info.forEach((item, index) => {
						let split_name = email_info[0].guardian_name.trim().split(" ");
						let latter_name = split_name[0] == split_name[split_name.length - 1] ? "" : split_name[split_name.length - 1];
						full_email_obj.push({
							email: item.guardian.email,
							first_name: split_name,
							last_name: latter_name,
							url: "Check out your week statuses here: " + process.env.CURRENT_URL + "reg-status?camper_id=" + item.camper_unique_id
						});
					});
				}
				console.log(full_email_obj);
				let all_emails = full_email_obj.map((item, index) => {
					return full_sendmail(item.email, req.body.subject, req.body.message, item);
				});
				Promise.all(all_emails).catch((err) => {
					console.log(err);
				}).then((email) => {
					console.log(email);
					res.end();
				});
			});
		});
	} catch (error) {
		error.message = "Hmm... Looks like sending mail didn't work, try reloading?";
		next(error);
	}
});

router.post("/isDatabaseConnected", (req, res, next) => {
	if (req.body.code == process.env.DATABASE_CHECK_CODE) {
		console.log("System received database check");
		connection.query("SELECT value_str FROM system_settings", function(err, value) {
	    		if (!err) {
	      			res.end("No error :)");
	    		}
			if (err) {
				connection = mysql.createConnection({
				        host: process.env.HOST,
				        database: process.env.DATABASE,
				        password: process.env.PASSWORD,
				        user: process.env.DB_USER,
				        insecureAuth: true
				});
				connection.connect((err) => {
	        			if (err) throw err;
					console.log("No restart error");
					res.end("Mysql rebooted ;)");
				});
			}
  		});
	} else {
		res.end("Incorrect code");
	}
});

module.exports = router;
