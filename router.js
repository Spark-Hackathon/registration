const bodyParser = require("body-parser");
const nodemail = require("nodemailer");
const sendmail = require("sendmail");
const express = require("express");
const mysql = require("mysql2");
const Joi = require("joi");

const {
	getDate
} = require("./utils");

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

//connect to db
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

let week_meta;
connection.query("SELECT id, title, start_date, end_date, inClass_available, virtual_available FROM week", (err, row) => {
	if (err) console.log(err);
	let pre_week = new Map();
	for (row_number in row) {
		pre_week.set(row[row_number].title, {
			id: row[row_number].id,
			inclass_available: row[row_number].inClass_available,
			virtual_available: row[row_number].virtual_available,
			start_date: row[row_number].start_date,
			end_date: row[row_number].end_date
		});
	}
	week_meta = pre_week;
});

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
	borrow_laptop: Joi.number().max(1).required(),
	guardian_name: Joi.string().min(1).max(255).required(),
	guardian_email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	guardian_phone: Joi.number().min(10).max(10).required(),
	participated: Joi.number().max(1).required(),
});

router.get("/open-weeks", (req, res) => {
	let week_data = [];
	for (let [key, value] of week_meta) {
		let inner = {};
		inner.id = value.id;
		inner.title = key;
		inner.inclass_available = value.inclass_available;
		inner.virtual_available = value.inclass_available;
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

router.post("/camper-register-queueing", async (req, res) => {
	if (camper_schema.validate(req.body)) {
		let item = req.body;
		item.type = type_meta[item.type];
		connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], (err, pre_id) => {
			if (err) res.render("error", {
				title: `Help! – Summer Camp ${getDate()}`,
				error: "Hmm... Looks like registering didn't work, try reloading?"
			});
			let camper_writeup;
			let extra_camper_info = [];
			extra_camper_info.push(item.first_name, item.last_name, item.email, item.dob, item.school, item.grade, item.gender, item.type, item.race_ethnicity,
				item.hopes, item.tshirt_size, item.borrow_laptop, item.guardian_name, item.guardian_email, item.guardian_number, item.participated);
			if (pre_id.length) {
				camper_writeup = "UPDATE camper SET first_name=?, last_name=?, email=?, dob=?, school=?, grade=?, gender=?, type=?, race_ethnicity=?, " +
					"hopes_dreams=?, tshirt_size=?, borrow_laptop=?, guardian_name=?, guardian_email=?, guardian_phone=?, participated=? WHERE first_name=? AND last_name=? AND email=?";
				extra_camper_info.push(item.first_name, item.last_name, item.email);
			} else {
				camper_writeup = "INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, " +
					"hopes_dreams, tshirt_size, borrow_laptop, guardian_name, guardian_email, guardian_phone, participated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			}
			// add them to the camper database, then enrollment based on their weeks
			connection.query(camper_writeup, extra_camper_info, async (err) => {
				if (err) {
					res.render("error", {
						title: `Help! – Summer Camp ${getDate()}`,
						error: "Hmm... Looks like registering didn't work, try reloading?"
					});
				} else {
					connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], async (err, camper_id) => {
						if (err) res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like registering didn't work, try reloading?"
						});
						//insert for each week they signed up for
						let weeks = [],
							count = 0;
						week_meta.forEach((week, index) => {
							for (pieces in item) {
								if (parseInt(pieces, 10) == week.id && item[pieces.toString()] != 0) {
									weeks[count] = [];
									weeks[count][0] = pieces;
									weeks[count][1] = item[pieces];
									count++;
								}
							}
						});
						async function enrollmentInsert(week) {
							return new Promise((resolve, reject) => {
								connection.query("INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved, confirmed) VALUES " +
									"(?, ?, ?, ?, ?, ?, ?)", [camper_id[0].id, week[0], new Date(), uuidv4(), week[1] - 1, 0, 0], (err) => {
										if (err) reject(err);
										connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", week[0][0], (err, questions) => {
											if (err) reject(err);
											if (questions.length) resolve(questions);
											resolve([]);
										});
									});
							});
						}
						let questions = [];
						let question_position = 0;
						if (weeks.length) {
							let transporter = nodemail.createTransport({
								sendmail: true,
								newline: 'unix',
								path: 'user/sbin/sendmail'
							});
							for (let weeks_db = 0; weeks_db < weeks.length; weeks_db++) {
								let any_questions = await enrollmentInsert(weeks[weeks_db]);
								try {
									//each week sends back questions for the specific person - need to build up an array
									for (let question = 0; question < any_questions.length; question++) {
										questions[question_position] = {
											question_text: any_questions[question].question_text,
											id: any_questions[question].id
										}
										question_position++;
									}
									if (weeks_db == weeks.length - 1) {
										if (item.refer_name && item.refer_email) {
											let user_data = {}
											user_data.refer_id = camper_id[0].id;
											user_data.name = item.refer_name;;
											user_data.email = item.refer_email;
											if (referral_schema.validate(user_data)) {
												await prospectSignup(user_data);
												try {
													tranporter.sendMail({
														from: "spark" + getDate() + "@cs.stab.org",
														to: item.email,
														subject: "You've signed up!",
														text: "Hey " + item.first_name + " " + item.last_name + ", we've received your signup, we'll go and check out the application in just a bit!"
													}, (err, info) => {
														console.log(err, info);
													});
													connection.query("DELETE FROM prospect WHERE email=?", item.email, (err) => {
														if (err) console.log(err);
														res.render("question.hbs", {
															title: `Application Questions – Summer Spark ${getDate()}`,
															year: getDate(),
															camper_id: camper_id[0].id,
															questions: questions
														});
													});
												} catch (error) {
													res.render("error", {
														title: `Help! – Summer Camp ${getDate()}`,
														error: "Hmm... Looks like registering didn't work, try reloading?"
													});
												}
											} else {
												res.render("error", {
													title: `Help! – Summer Camp ${getDate()}`,
													error: "Hmm... Looks like registering didn't work, try reloading?"
												});
											}
										} else {
											//send finish email, done
											transport.sendMail({
												from: 'spark' + getDate() + '@cs.stab.org',
												to: item.email,
												subject: "You've signed up!",
												text: "Hey " + item.first_name + " " + item.last_name + ", we've received your signup, we'll go and check out the application in just a bit!"
											}, (err, info) => {
												console.log(err, info);
											});
											res.render("question.hbs", {
												title: `Application Questions – Summer Spark ${getDate()}`,
												year: getDate(),
												camper_id: camper_id[0].id,
												questions: questions
											});
										}
									}
								} catch (error) {
									res.render("error", {
										title: `Help! – Summer Camp ${getDate()}`,
										error: "Hmm... Looks like registering didn't work, try reloading?"
									});
								}
							}
						}
					});
				}
			});
		});
	} else {
		console.log(camper_schema.validate(req.body).error);
		res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like registering didn't work, try reloading?"
		});
	}
});

router.post("/camper-submit-questions", (req, res) => {
	async function insertion(question_id, response) {
		return new Promise((resolve, reject) => {
			connection.query("INSERT INTO questions (camper_id, question_meta_id, question_response) VALUES (?, ?, ?)", [req.body.camper_id, question_id, response], (err) => {
				if (err) reject(err);
				resolve();
			});
		});
	}
	if (req.body.responses.length) {
		req.body.responses.forEach(async (item, index) => {
			await insertion(item.question_id, item.response);
			try {
				if (index = req.body.responses.length - 1) {
					res.end();
				}
			} catch (error) {
				res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting week didn't work, try reloading?"
				});
			}
		});
	} else {
		res.end();
	}
});

router.post("/signup-prospect", async (req, res) => {
	if (referral_schema.validate(req.body)) {
		await prospectSignup(req.body);
		try {
			res.redirect("/updates/thank-you");
		} catch (error) {
			res.render("error", {
				title: `Help! – Summer Camp ${getDate()}`,
				error: "Hmm... Looks like deleting week didn't work, try reloading?"
			});
		}
	} else {
		console.log(pros_schema.validate(user_data).error);
		res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting week didn't work, try reloading?"
		});
	}
});

// this will work for all the needed inserts into prospect, just change subscribed
async function prospectSignup(user_data) {
	return new Promise((resolve, reject) => {
		let unique_retrieval = uuidv4();
		if (user_data.refer_id) {
			connection.query("INSERT INTO prospect (camper_refer_id, name, email, unique_retrieval, subscribed) VALUES (?, ?, ?, ?, ?)", [user_data.refer_id, user_data.name, user_data.email, unique_retrieval, 1], (err) => {
				if (err) reject(err);
				resolve(false);
			});
		} else {
			connection.query("INSERT INTO prospect (name, email, unique_retrieval, subscribed) VALUES (?, ?, ?, ?)", [user_data.name, user_data.email, unique_retrieval, 1], (err) => {
				if (err) reject(err); //chat with bre about error handle
				resolve(false);
			});
		}
	});
}

router.get("/admin/get-weeks", (req, res) => {
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
});

router.post("/admin/delete-week", async (req, res) => {
	connection.query("SELECT system_settings.value_str, week.title FROM system_settings system_settings CROSS JOIN week week WHERE system_settings.name='admin_code' AND week.id=?", req.body.id, async (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting week didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			let obj = {
				week_question: []
			};
			connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", req.body.id, async (err, question_meta_info) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting week didn't work, try reloading?"
				});
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
						try {
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
									if (err) console.log(err);
									week_meta.delete(code[0].title);
									res.json(obj);
								});
							}
						} catch (error) {
							res.render("error", {
								title: `Help! – Summer Camp ${getDate()}`,
								error: "Hmm... Looks like deleting week didn't work, try reloading?"
							});
						}
					});
				} else {
					connection.query("DELETE FROM week WHERE id=?", req.body.id, (err) => {
						if (err) res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like deleting week didn't work, try reloading?"
						});
						week_meta.delete(code[0].title);
						res.end();
					});
				}
			});
		} else {
			res.render("error", {
				title: `Help! – Summer Camp ${getDate()}`,
				error: "Hmm... Looks like deleting week didn't work, try reloading?"
			});
		}
	});
});

const add_week_schema = Joi.object({
	code: Joi.string().length(36).required(),
	week_name: Joi.string().max(255).required(),
	start_date: Joi.date().min("2015-01-01").required(),
	end_date: Joi.date().min("2015-01-01").required(),
	inclass_available: Joi.number().min(1).max(1).required(),
	virtual_available: Joi.number().min(1).max(1).required()
});

router.post("/admin/add-week", (req, res) => {
	if (add_week_schema.validate(req.body)) {
		connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
			if (err) console.log(err);
			if (req.body.code == code[0].value_str) {
				connection.query("INSERT INTO week (title, start_date, end_date, cb_code, inClass_available, virtual_available) VALUES (?, ?, ?, ?, ?, ?)", [req.body.week_name, req.body.start_date, req.body.end_date, req.body.cb_code, req.body.inclass_available, req.body.virtual_available], (err) => {
					if (err) console.log(err);
					connection.query("SELECT id FROM week WHERE title=? AND start_date=? AND end_date=?", [req.body.week_name, req.body.start_date, req.body.end_date], (err, row) => {
						if (err) console.log(err);
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
			} else {
				res.redirect("/");
			}
		});
	} else {
		res.redirect("/");
	}
});

router.get("/admin/get-questions/:code", async (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like getting your question didn't work, try reloading?"
		});
		if (req.params.code == code[0].value_str) {
			connection.query("SELECT COUNT(id) AS question_count FROM question_meta", (err, question_length) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like adding your question didn't work, try reloading?"
				});
				let question_obj = [];
				async function pull_questions(week_name, week_id) {
					return new Promise((resolve, reject) => {
						async function pull_responses(question_meta_id) {
							return new Promise((resolve_res, reject_rej) => {
								connection.query("SELECT camper_id, question_response FROM questions WHERE question_meta_id=?", question_meta_id, (err, response) => {
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
									let responses = await pull_responses(question.id);
									try {
										let inner = {};
										inner.week = week_name;
										inner.id = question.id;
										inner.question = question.question_text;
										inner.responses = [];
										responses.forEach((response, response_index) => {
											inner.responses.push({
												id: response.camper_id,
												response: response.question_response
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
					let inner_array = await pull_questions(index, week.id);
					try {
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
						res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like adding your question didn't work, try reloading?"
						});
					}
				});
			});
		}
	});
});

router.post("/admin/add-question", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like adding your question didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			let week_id = week_meta.get(req.body.week).id;
			connection.query("INSERT INTO question_meta (week_id, question_text) VALUE (?, ?)", [week_id, req.body.question], (err) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like adding your question didn't work, try reloading?"
				});
				res.end();
			});
		}
	});
});

router.post("/admin/delete-question", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting your question didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			let week_id = week_meta.get(req.body.week).id;
			connection.query("DELETE FROM question_meta WHERE id=? AND week_id=?", [req.body.id, week_id], (err) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting your question didn't work, try reloading?"
				});
				res.end();
			});
		}
	});
});

router.post("/admin/delete-response", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting this response didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			connection.query("DELETE FROM questions WHERE camper_id=? AND question_meta_id=?", [req.body.camper_id, req.body.question_id], (err) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting this response didn't work, try reloading?"
				});
				res.end();
			});
		}
	});
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
			let confirmed_buffer = array[i][2];
			array[i][0] = array[j][0];
			array[i][1] = array[j][1];
			array[i][2] = array[j][2];
			array[j][0] = week_buffer;
			array[j][1] = camper_buffer;
			array[j][2] = confirmed_buffer;
		}
	}
	if (i >= 0) {
		let week_buffer = array[i - 1][0];
		let camper_buffer = array[i - 1][1];
		let confirmed_buffer = array[i - 1][2];
		array[i - 1][0] = array[pivot][0];
		array[i - 1][1] = array[pivot][1];
		array[i - 1][2] = array[pivot][2];
		array[pivot][0] = week_buffer;
		array[pivot][1] = camper_buffer;
		array[pivot][2] = confirmed_buffer;
	}
	return [i - 1, array];
}

router.post("/admin/pull-current-campers", async (req, res) => { //ADMIN
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like selecting the campers didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			//throw all currently pending campers - run through and see which ones are still waiting in enrollment
			let addition_on_camper = req.body['applicants-or-registered'] == 1 ? ", confirmed" : "";
			connection.query("SELECT camper_id, week_id" + addition_on_camper + " FROM enrollment WHERE approved=?", req.body['applicants-or-registered'], async (err, camper_ids) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like selecting the campers didn't work, try reloading?"
				});
				let obj = {
					campers: []
				};
				let id = [];
				let camper_pos = [];
				for (ids in camper_ids) {
					camper_pos[ids] = [];
					camper_pos[ids][0] = camper_ids[ids].week_id;
					camper_pos[ids][1] = camper_ids[ids].camper_id;
					camper_pos[ids][2] = camper_ids[ids].confirmed;
				}
				camper_pos = quicksort(camper_pos, 0, camper_pos.length - 1);

				function allCampers() {
					return new Promise((resolve, reject) => {
						//build up the week object
						let inner = {};
						connection.query("SELECT title FROM week WHERE id=?", id[1], (err, week_title) => {
							if (err) reject(err);
							inner.week = week_title[0].title;
							connection.query("SELECT id, first_name, last_name, type, hopes_dreams, participated FROM camper WHERE id=?", id, (err, camper) => {
								if (err) reject(err);
								inner.camper_id = camper[0].id;
								inner.first_name = camper[0].first_name;
								inner.last_name = camper[0].last_name;
								inner.type = camper[0].type;
								inner.hopes_dreams = camper[0].hopes_dreams;
								inner.participated = camper[0].participated == 1 ? "Participated before" : "Has not participated";
								if (id[2] == 0 || id[2] == 1) {
									inner.confirmed = id[2];
								}
								resolve(inner);
							});
						});
					});
				}
				let each_week_rolling = [];
				for (let each_id = 0; each_id < camper_ids.length; each_id++) {
					id[0] = camper_pos[each_id][1];
					id[1] = camper_pos[each_id][0];
					id[2] = camper_pos[each_id][2];
					obj.campers.push(await allCampers());
					try {
						if (each_id == camper_ids.length - 1) {
							console.log(obj);
							res.json(obj);
						}
					} catch (error) {
						res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like selecting the campers didn't work, try reloading?"
						});
					}
				}
				res.end();
			});
		} else {
			res.render("error", {
				title: `Help! – Summer Camp ${getDate()}`,
				error: "Hmm... Looks like selecting the campers didn't work, try reloading?"
			});
		}
	});
});

function ConvertToCSV(objArray) {
	var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
	var str = '';

	for (var i = 0; i < array.length; i++) {
		var line = '';
		for (var index in array[i]) {
			if (line != '') line += ','

			line += array[i][index];
		}

		str += line + '\r\n';
	}

	return str;
}

router.post("/admin/export/week", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			connection.query("SELECT * FROM camper INNER JOIN enrollment ON enrollment.camper_id = camper.id WHERE enrollment.week_id=?", week_meta.get(req.body.week_name).id, (err, week_campers) => {
				if (err) throw err;
				res.end(ConvertToCSV(week_campers));
			});
		}
	});
});

router.get("/admin/export/all/:code", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
		});
		if (req.params.code == code[0].value_str) {
			connection.query("SELECT * FROM camper", (err, all_campers) => {
				if (err) throw err;
				res.end(ConvertToCSV(all_campers));
			});
		}
	});
});

const application_schema = Joi.object({
	code: Joi.string().length(36).required(),
	camper_id: Joi.number().required(),
	week_name: Joi.string().required()
});

router.post("/admin/accept-camper-application", (req, res) => { //ADMIN
	if (application_schema.validate(req.body)) {
		connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
			if (err) res.render("error", {
				title: `Help! – Summer Camp ${getDate()}`,
				error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
			});
			if (req.body.code == code[0].value_str) {
				let transporter = nodemail.createTransport({
					sendmail: true,
					newline: 'unix',
					path: 'user/sbin/sendmail'
				});
				connection.query("SELECT first_name, last_name, email FROM camper WHERE id=?", req.body.camper_id, (err, email_info) => {
					if (err) res.render("error", {
						title: `Help! – Summer Camp ${getDate()}`,
						error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
					});
					if (email_info.length) {
						let approved_date = new Date();
						connection.query("UPDATE enrollment SET approved=1, approved_time=? WHERE camper_id=? AND week_id=?", [approved_date, req.body.camper_id, week_meta.get(req.body.week_name).id], (err) => {
							if (err) res.render("error", {
								title: `Help! – Summer Camp ${getDate()}`,
								error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
							});
							transporter.sendMail({
								from: "spark" + getDate + "@cs.stab.org",
								to: email_info[0].email,
								subject: "You were accepted for " + req.body.week_name,
								text: "Hey " + email_info.first_name + " " + email_info.last_name + ", "
							}, (err, info) => {
								res.render("error", {
									title: `Help! – Summer Camp ${getDate()}`,
									error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
								});
							});
							res.end();
						});
					}
				});
			}
		});
	} else {
		render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like accepting the campers didn't work, try reloading?"
		});
	}
});

router.post("/admin/confirm-camper", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like confirming a camper enrollment didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			connection.query("UPDATE enrollment SET confirmed=1, campbrain_completion=? WHERE camper_id=? AND week_id=?", [new Date(), req.body.camper_id, week_meta.get(req.body.week_name).id], (err) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like confirming a camper enrollment didn't work, try reloading?"
				});
				res.end();
			});
		}
	});
});

router.post("/admin/delete-enrollment", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting a camper enrollment didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			//check for if their an applicant or a regisered camper
			req.body.week_id = week_meta.get(req.body.week_name).id;
			connection.query("SELECT approved FROM enrollment WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err, approved) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting a camper enrollment didn't work, try reloading?"
				});
				if (approved[0].approved == 1) {
					connection.query("UPDATE enrollment SET approved=0 WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err) => {
						if (err) res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like deleting a camper enrollment didn't work, try reloading?"
						});
						res.redirect("/admin");
					});
				} else {
					connection.query("DELETE FROM enrollment WHERE camper_id=? AND week_id=?", [req.body.camper_id, req.body.week_id], (err) => {
						if (err) res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like deleting a camper enrollment didn't work, try reloading?"
						});
						res.redirect("/admin");
					});
				}
			});
		}
	});
});

router.post("/admin/delete-camper", (req, res) => {
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like deleting a camper didn't work, try reloading?"
		});
		if (req.body.code == code[0].value_str) {
			connection.query("SELECT * FROM camper WHERE first_name=? AND last_name=? AND email=?", [req.body.first_name, req.body.last_name, req.body.email], (err, camper_value) => {
				if (err) res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like deleting a camper didn't work, try reloading?"
				});
				connection.query("DELETE FROM camper WHERE first_name=? AND last_name=? AND email=?", [req.body.first_name, req.body.last_name, req.body.email], (err) => {
					if (err) res.render("error", {
						title: `Help! – Summer Camp ${getDate()}`,
						error: "Hmm... Looks like deleting a camper didn't work, try reloading?"
					});
					res.json(camper_value);
				});
			});
		}
	});
});

router.post("/admin/send-mail", async (req, res) => { //ADMIN
	connection.query("SELECT value_str FROM system_settings WHERE name='admin_code'", async (err, code) => {
		if (err) res.render("error", {
			title: `Help! – Summer Camp ${getDate()}`,
			error: "Hmm... Looks like sending mail didn't work, try reloading?"
		});
		let all_campers;
		let transporter = nodemail.createTransport({
			sendmail: true,
			newline: 'unix',
			path: 'user/sbin/sendmail'
		});
		if (req.body.code == code[0].value_str) {
			async function pull_campers() {
				return new Promise((resolve, reject) => {
					if (req.body.weeks.length > 0) {
						let week_value = "";
						week_value = " WHERE enrollment.week_id=?";
						if (req.body.weeks.length > 1) {
							req.body.weeks.forEach((item, index) => {
								req.body.weeks[index] = week_meta.get(item).id;
								week_value += index < req.body.weeks.length - 1 ? " OR enrollment.week_id=?" : "";
							});
						}
						week_value += req.body.applicants == 1 ? " AND approved=0" : "";
						week_value += req.body.registered == 1 ? " OR approved=1" : "";
						connection.query("SELECT DISTINCT camper_id, first_name, last_name, email FROM enrollment INNER JOIN camper ON enrollment.camper_id = camper.id" + week_value, req.body.weeks, (err, enrolled_info) => {
							if (err) reject(err);
							resolve(enrolled_info);
						});
					} else {
						resolve(0);
					}
				});
			}

			function send_mail(first_name, last_name, email) {
				let temp_text = req.body.message.replace("{{FIRST_NAME}}", first_name);
				temp_text = temp_text.replace(" {{LAST_NAME}}", last_name);
				transporter.sendMail({
					from: "spark" + getDate + "@cs.stab.org",
					to: email,
					subject: req.body.subject,
					text: temp_text
				}, (err, info) => {
					res.render("error", {
						title: `Help! – Summer Camp ${getDate()}`,
						error: "Hmm... Looks like sending mail didn't work, try reloading?"
					});
				});
			}
			let all_campers = await pull_campers();
			try {
				if (req.body.prospects == 1) {
					connection.query("SELECT name, email FROM prospect WHERE subscribed=1", (err, prospect_info) => {
						if (err) res.render("error", {
							title: `Help! – Summer Camp ${getDate()}`,
							error: "Hmm... Looks like sending mail didn't work, try reloading?"
						});
						//run through each of these, then send emails for each of them
						if (all_campers.length) {
							all_campers.forEach((item, index) => {
								send_mail(item.first_name, " " + item.last_name, item.email);
							});
						}
						if (prospect_info.length) {
							prospect_info.forEach((item, index) => {
								if (item.name.indexOf(" ") > 0) {
									let name = item.name.split(" ");
									send_mail(name[0], " " + name[name.length - 1], item.email);
								} else {
									send_mail(item.name, "", item.email)
								}
							});
						}
					});
				} else {
					if (all_campers.length) {
						all_campers.forEach((item, index) => {
							send_mail(item.first_name, item.last_name, item.email);
						});
					}
				}
			} catch (error) {
				res.render("error", {
					title: `Help! – Summer Camp ${getDate()}`,
					error: "Hmm... Looks like sending mail didn't work, try reloading?"
				});
			}
		}
	});
});

module.exports = router;