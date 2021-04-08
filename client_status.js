const bodyParser = require("body-parser");
const express = require("express");
const mysql = require("mysql2");

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

connection.connect((err) => {
        if (err) throw err;
});

function real_accounting(camper_id) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT id FROM camper WHERE camper_unique_id=?", camper_id, (err, count) => {
			if (err || count.length == 0) reject(err);
			resolve();
		});
	})
}

client.use(bodyParser.urlencoded({
	extended: false
}));
client.use(bodyParser.json());

client.get("/get-status", (req, res, next) => {
	//cross-check the id with db
	try {

	} catch (error) {
		error.message = "Looks like there was a problem pulling up your registration status, try reloading?";
		next(error);
	}
});

module.exports = client;
