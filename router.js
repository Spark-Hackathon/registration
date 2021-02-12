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
	subscribed: Joi.number().max(1)
});

//joi prospect schema
const camper_schema = Joi.object({
	dob: Joi.date().max("2015-01-01").required(),
	school: Joi.string().min(1).max(255).required(),
	grade: Joi.number().min(10).max(18).required(),
	gender: Joi.string().min(1).max(255),
	type: Joi.number().min(0).max(5).required(), //change for the type object
	race_ethinicity: Joi.string().max(255),
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
	participated: Joi.number().max(1).required()
}).concat(basic_schema);

router.post("/camperRegisterQueueing", (req, res) => {
	if (camper_schema.validate(req.body)) {
		let item = req.body;
		for (let type in type_meta) {
			item.type = item.type == type_meta[type] ? type_meta[type] : item.type;
		}
		// add them to the camper database, then enrollment based on their weeks
		connection.query("INSERT INTO camper (first_name, last_name, email, dob, school, grade, gender, type, race_ethnicity, " + 
			"hopes_dreams, tshirt_size, borrow_laptop, guardian_name, guardian_email, participated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[item.first_name, item.last_name, item.email, item.dob, item.school, item.grade, item.gender, item.type, item.race_ethnicity, 
			item.hopes_dreams, item.tshirt_size, item.borrow_laptop, item.guardian_name, item.guardian_email, item.participated], (err) => {
				if (err) console.log(err);
			});
	} else {
		console.log(camper_schema.validate(req.body).error);
	}
});

router.post("/signupProspect", async (req, res) => {
	let prospectStatus = await prospectSignup(req.body);
	try {
		res.end();
	} catch (error) {
		console.log(error);
	}
});

// this will work for all the needed inserts into prospect, just change subscribed
async function prospectSignup(user_data) {
	return new Promise((resolve, reject) => {
		if (pros_schema.validate(user_data)) {
			let unique_retrieval = uuidv4();
			connection.query("INSERT INTO prospect (first_name, last_name, email, unique_retrieval, subscribed) VALUES (?, ?, ?, ?, ?)", [user_data.first_name, user_data.last_name, user_data.email, unique_retrieval, user_data.subscribed], (err) => {
				if (err) reject(err); //chat with bre about error handle
				resolve(false);
			});
		} else {
			console.log(pros_schema.validate(user_data).error);
		}
	});
}

module.exports = router;