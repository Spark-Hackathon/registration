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
			//STEP ONE - build up the basic data for each camper: first_name, last_name, weeks
			connection.query("SELECT week.id AS week, first_name, last_name, title FROM camper INNER JOIN enrollment ON camper.id=enrollment.camper_id INNER JOIN week ON enrollment.week_id=week.id WHERE camper.id=?", item.camper_id, (err, camper_info) => {
				if (err) throw err;
				if (!camper_info || !camper_info.length) resolve();
				//STEP TWO - need to then run through the medical data FOR EACH ROW of that camper and add it onto them
				let camper_info_decrypt = [];
				camper_info.forEach((camper, inner_index) => {
					camper_info_decrypt[inner_index] = {
						week_id: camper.week,
						title: camper.title,
						first_name: camper.first_name,
						last_name: camper.last_name
					};
					//run through the encrypted data and decrypt
					Object.keys(item).forEach((key) => {
						if (key != "camper_id") camper_info_decrypt[inner_index] = { ...camper_info_decrypt[inner_index],
							...{
								[key]: decrypt(item[key])
							}
						};
					});
				});
				resolve(camper_info_decrypt);
			});
		});
	});
	await Promise.all(return_meds).then(campers => {
		campers.forEach((item) => {
			all_meds = all_meds.concat(item);
		});
	});
	function compareNumbers(first_value, second_value) {
		return first_value.week - second_value.week;
	}
	//Sort each of the values based on: week, last_name, first_name
	all_meds.sort((first_value, second_value) => {
		if (first_value.week_id > second_value.week_id) return 1;
		if (first_value.week_id < second_value.week_id) return -1;
		if (first_value.last_name > second_value.last_name) return 1;
		if (first_value.last_name < second_value.last_name) return -1;
		if (first_value.first_name > second_value.first_name) return 1;
		if (first_value.first_name < second_value.first_name) return -1;
		return 0;
	});
	console.log(ConvertToCSV(all_meds));
});