require('dotenv').config({
	path: __dirname + "/.env"
});
const mysql = require('mysql2');
const {
	ConvertToCSV,

} = require("./utils.js");

const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	password: process.env.PASSWORD,
	user: process.env.DB_USER,
	insecureAuth: true
});

connection.connect((err) => {
	if (err) throw (err);
});

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function make_emails(camperORparent) {
	return new Promise((resolve, reject) => {
		connection.query("SELECT camper_unique_id, first_name, last_name, email, guardian_email FROM camper", (err, camper) => {
			if (err) reject(err);

			let new_camper = [];
			let new_guardian = [];

			resolve(ConvertToCSV(camper));
			/*camper.forEach((individual) => {
				new_camper.push({
					camper_unique_id: individual.camper_unique_id,
					first_name: individual.first_name,
					last_name: individual.last_name,
					email: individual.email,
					week: individual.title,
					dates: months[new Date(individual.start_date).getMonth()] + " " + new Date(individual.start_date).getDate() + "-" + months[new Date(individual.end_date).getMonth()] + " " + new Date(individual.end_date).getDate(),
					camper_guardian: "campers"
				});
				new_guardian.push({
					camper_unique_id: individual.camper_unique_id,
					first_name: individual.first_name,
					last_name: individual.last_name,
					email: individual.guardian_email,
					week: individual.title,
					dates: months[new Date(individual.start_date).getMonth()] + " " + new Date(individual.start_date).getDate() + "-" + months[new Date(individual.end_date).getMonth()] + " " + new Date(individual.end_date).getDate(),
					camper_guardian: "parents/guardians"
				});
			});
			resolve(ConvertToCSV([...new_camper, ...new_guardian]));
			*/
		});
	});
}

make_emails(1).then((result) => {
	console.log(result);
	connection.close();
	process.exit();
});