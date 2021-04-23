require("dotenv").config({
	path: __dirname + "/.env"
});
// common utility functions
const express = require("express");
const mysql = require("mysql2");
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

const getDate = () => `'${new Date().getFullYear().toString().substr(-2)}`;

// make connection to server
const utilities = express.Router();

utilities.post("/isDatabaseConnected", (req, res, next) => {
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

module.exports = {
	connection,
	utilities,
    getDate
}