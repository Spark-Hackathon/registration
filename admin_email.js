require('dotenv').config({
	path: __dirname + "/.env"
});
const nodemail = require("nodemailer");
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

let transporter = nodemail.createTransport({
	sendmail: true,
	newline: 'unix',
	path: '/usr/sbin/sendmail'
});

const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	user: process.env.DB_USER,
	password: process.env.PASSWORD,
	insecureAuth: true
});

connection.connect((err) => {
	if (err) throw err;
});

connection.query("SELECT DISTINCT id FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id WHERE enrollment.approved=0", (err, applied_campers) => {
	if (err) throw err;
	if (!applied_campers || !applied_campers.length) throw "No campers";
	connection.query("SELECT value_str FROM system_settings WHERE name='email_admin_image'", (err, email_images) => {
		if (err) throw err;
		let admin_file = fs.readFileSync(path.join(__dirname, "emailTemplates", "admin_email")).toString();
		admin_file = admin_file.replace("{{CAMPER_AMOUNT}}", applied_campers.length);
		admin_file = admin_file.replace("{{IMG_URL}}", email_images[Math.round(Math.random() * email_images.length)].value_str);
		admin_file = applied_campers.length != 1 ? admin_file.replace("{{PLURAL_VALUE}}", "s") : admin_file.replace("{{PLURAL_VALUE}}", "");
		transporter.sendMail({
			from: '"Mailboy+"<mailboy@cs.stab.org>',
			replyTo: 'zminster@stab.org',
			to: 'spark@stab.org',
			subject: "Camper applicants? Check here",
			text: admin_file
		}, (err, info) => {
			if (err) console.error(err);
			console.log(info);
		});
		connection.close();
	});
});