const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");
const Joi = require("joi");

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

//joi prospect schema
const pros_schema = Joi.object({
	first_name: Joi.string().min(1).max(255).required(),
	last_name: Joi.string().min(1).max(255).required(),
	email: Joi.string().email({
		minDomainSegments: 1,
		tlds: {
			allow: true
		}
	}).required(),
	subscribed: Joi.number().max(1).required()
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