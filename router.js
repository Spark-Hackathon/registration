const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const Joi = require("joi");

const type_meta = {
	designer: 0,
	artist: 1,
	researcher: 2,
	writer: 3,
	leader: 4,
	none: 5
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

let week_meta = new Map();
connection.query("SELECT id, title, start_date, end_date, inClass_available, virtual_available FROM week", (err, row) => {
	if (err) return 0;
	for (row_number in row) {
		week_meta.set(row[row_number].title, {
			id: row[row_number].id,
			inclass_available: row[row_number].inClass_available,
			virtual_available: row[row_number].virtual_available,
			start_date: row[row_number].start_date,
			end_date: row[row_number].end_date
		});
	}
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
	dob: Joi.date().max("2015-01-01").required(),
	school: Joi.string().min(1).max(255).required(),
	grade: Joi.number().min(10).max(18).required(),
	gender: Joi.string().min(1).max(255).required(),
	type: Joi.string().min(5).max(255).lowercase().required(), //change for the type object
	race_ethnicity: Joi.string().max(255).required(),
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
	participated: Joi.number().max(1).required(),
	attendance_method: Joi.number().max(1).required(),
	weeks_coming: Joi.array().items(Joi.string().min(1).max(255).required())
}).concat(basic_schema);

router.post("/camperRegisterQueueing", async (req, res) => {
	if (camper_schema.validate(req.body)) {
		let item = req.body;
		await prospectSignup(req.body);
		try {
			item.type = type_meta[item.type];
			// add them to the camper database, then enrollment based on their weeks
			connection.query("INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, " +
				"hopes_dreams, tshirt_size, borrow_laptop, guardian_name, guardian_email, participated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [item.first_name, item.last_name, item.email, item.dob, item.school, item.grade, item.gender, item.type, item.race_ethncity,
					item.hopes_dreams, item.tshirt_size, item.borrow_laptop, item.guardian_name, item.guardian_email, item.participated
				], async (err) => {
					if (err) console.log(err);
					//insert for each week they signed up for
					let weeks = [],
						count = 0;
					for (week in item.weeks_coming) {
						if (week_meta.has(item.weeks_coming[week])) {
							//make a new list of which weeks they're in, then add to enrollment based on that
							weeks[count] = item.weeks_coming[week];
							count++;
						}
					}
					connection.query("SELECT id FROM camper WHERE first_name=? AND last_name=? AND email=?", [item.first_name, item.last_name, item.email], async (err, camper_id) => {
						if (err) console.log(err);
						async function enrollmentInsert(week) {
							return new Promise((resolve, reject) => {
								connection.query("INSERT INTO enrollment (camper_id, week_id, signup_time, enrollment_code, person_loc, approved) VALUES " +
									"(?, ?, ?, ?, ?, ?)", [camper_id[0].id, week_meta.get(week).id, new Date(), uuidv4(), item.attendance_method, 0], (err) => {
										if (err) reject(err);
										connection.query("SELECT id, question_text FROM question_meta WHERE week_id=?", week_meta.get(week).id, (err, questions) => {
											if (err) reject(err);
											if (questions.length) resolve(questions);
											resolve([]);
										});
									})
							});
						}
						let questions = [], question_ids = [];
						if (weeks.length) {
							for (let weeks_db = 0; weeks_db < weeks.length; weeks_db++) {
								let any_questions = await enrollmentInsert(weeks[weeks_db]);
								try {
									//each week sends back questions for the specific person - need to build up an array
									for (let question = 0; question < any_questions.length; question++) {
										questions[question] = any_questions[question].question_text;
										question_ids[question] = any_questions[question].id;
									}
								} catch (error) {
									console.log(error);
								}
							}
						}
						res.end(JSON.stringify([questions, question_ids]));
					});
				});
		} catch (error) {
			console.log(error);
		}
	} else {
		console.log(camper_schema.validate(req.body).error);
	}
});

router.post("/signupProspect", async (req, res) => {
	if (pros_schema.validate(req.body)) {
		await prospectSignup(req.body);
		try {
			res.end();
		} catch (error) {
			console.log(error);
		}
	} else {
		console.log(pros_schema.validate(user_data).error);
	}
});

// this will work for all the needed inserts into prospect, just change subscribed
async function prospectSignup(user_data) {
	return new Promise((resolve, reject) => {
		let unique_retrieval = uuidv4();
		connection.query("INSERT INTO prospect (first_name, last_name, email, unique_retrieval, subscribed) VALUES (?, ?, ?, ?, ?)", [user_data.first_name, user_data.last_name, user_data.email, unique_retrieval, user_data.updates], (err) => {
			if (err) reject(err); //chat with bre about error handle
			resolve(false);
		});
	});
}

module.exports = router;