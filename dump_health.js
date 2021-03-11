//a script for decrypting database information with a private key -- using decrypt.js
require('dotenv').config({
	path: __dirname + "/.env"
});
const mysql = require('mysql2');

const {
	decrypt,
	chunk_decrypt
} = require("./crypto/decrypt.js");

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

connection.query("SELECT * FROM medical_forms", async (err, medical_forms) => {
	if (err) throw err;
	if (!medical_forms || !medical_forms.length) throw "No values in database";
	//run through each of the values and turn them into unencrypted values
	//build up an object and then turn it into a csv
	let all_meds = [];
	let return_meds = medical_forms.map((item, index) => {
		return new Promise((resolve) => {
			all_meds[index] = {
				camper_id: item.camper_id
			};
			Object.keys(item).forEach((med) => {
				if (med != "camper_id") all_meds[index][med] = decrypt(item[med]);
			});
			//then run through and grab all their med data
			connection.query("SELECT * FROM meds WHERE camper_id=?", item.camper_id, (err, meds) => {
				if (err) throw err;
				if (medical_forms && medical_forms.length) {
					//run through each row and buil an object to return
					all_meds[index].meds = [];
					meds.forEach((med, med_index) => {
						let med_obj = {};
						Object.keys(med).forEach((each_dose) => {
							if (each_dose != "camper_id") med_obj[each_dose] = decrypt(med[each_dose]);
						});
						all_meds[index].meds.push(med_obj);
					});
					resolve();
				}
			});
		});
	});
	await Promise.all(return_meds);
	console.log(JSON.stringify(all_meds));
});