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
			line += "\"" + array[i][index] + "\"";
		}
		str += line + '\r\n';
	}
	return str;
}

function sort_value(first_value, second_value) {
	if (first_value.week > second_value.week) return 1;
	if (first_value.week < second_value.week) return -1;
	if (first_value.last_name > second_value.last_name) return 1;
	if (first_value.last_name < second_value.last_name) return -1;
	if (first_value.first_name > second_value.first_name) return 1;
	if (first_value.first_name < second_value.first_name) return -1;
	return 0;
};

//NOTE: position 3 in the argv is week, and position 4 is table selection
async function run_query() {
	if (!process.argv[2] || !process.argv[3]) return "\nPlease insert one of the following values for the inputs for the week: 0 (for all), " +
		"1 (for web dev), 2 (for creative coding), 3 (for art of games) Followed by which value you wish for: " +
	"medical_forms, meds, or consent_release.\n";
	if (process.argv[3] == "medical_forms") return new Promise((full_resolve) => {
		connection.query("SELECT * FROM medical_forms", async (err, medical_forms) => {
			if (err) throw err;
			if (!medical_forms || !medical_forms.length) throw "No values in database";
			//run through each of the values and turn them into unencrypted values
			//build up an object and then turn it into a csv
			let all_meds = [];
			let return_meds = medical_forms.map((item, index) => {
				return new Promise((resolve) => {
					//STEP ONE - build up the basic data for each camper: first_name, last_name, weeks
					let extra_where_clause = process.argv[2] == 0 ? "" : " AND week_id=?";
					let conditions = process.argv[2] == 0 ? [item.camper_id] : [item.camper_id, process.argv[2]];
					connection.query("SELECT week.id AS week, first_name, last_name, title FROM camper INNER JOIN " +
						"enrollment ON camper.id=enrollment.camper_id INNER JOIN week ON enrollment.week_id=week.id " +
						"WHERE enrollment.approved=1 AND camper.id=?" + extra_where_clause, conditions, (err, camper_info) => {
							if (err) throw err;
							if (!camper_info || !camper_info.length) return resolve("NO VALUE");
							//STEP TWO - need to then run through the medical data FOR EACH ROW of that camper and add it onto them
							let camper_info_decrypt = [];
							camper_info.forEach((camper, inner_index) => {
								camper_info_decrypt[inner_index] = {
									week: camper.week,
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
					item.forEach((inner) => {
						inner = inner.replace(/"/g, '\\\"');
					});
					if (item != "NO VALUE") all_meds = all_meds.concat(item);
				});
			});
			//Sort each of the values based on: week, last_name, first_name
			all_meds.sort(sort_value);
			full_resolve(ConvertToCSV(all_meds));
		});
	});
	if (process.argv[3] == "meds") return new Promise((resolve) => {
		//inner week selection
		let extra_where_clause = process.argv[2] == 0 ? "" : " AND week_id=?";
		let conditions = process.argv[2] == 0 ? [] : process.argv[2];
		connection.query("SELECT enrollment.week_id AS week, title, first_name, last_name, medication_name, medication_time, medication_dosage, medication_notes, " +
			"epi_pen_info FROM camper INNER JOIN enrollment ON camper.id=enrollment.camper_id LEFT JOIN week ON week.id=enrollment.week_id LEFT JOIN meds ON " +
			"camper.id=meds.camper_id LEFT JOIN medical_forms ON camper.id=medical_forms.camper_id WHERE enrollment.approved=1" + extra_where_clause, conditions, (err, meds_info) => {
				if (err) console.log(err);
				//console.log(meds_info);
				//decryption step
				let medical_object = [];
				meds_info.forEach((med, index) => {
					medical_object[index] = {};
					Object.keys(med).forEach(slice_med => {
						let object_addition;
						if (slice_med == "week" || slice_med == "title" || slice_med == "first_name" || slice_med == "last_name") {
							object_addition = {
								[slice_med]: med[slice_med]
							};
						} else object_addition = {
							[slice_med]: decrypt(med[slice_med])
						};
						medical_object[index] = { ...medical_object[index],
							...object_addition
						};
					});
				});
				medical_object.sort(sort_value);
				resolve(ConvertToCSV(medical_object));
			});
	});
	if (process.argv[3] == "consent_release") return new Promise((resolve) => {
		let extra_where_clause = process.argv[2] == 0 ? "" : " AND week_id=?";
		let conditions = process.argv[2] == 0 ? [] : process.argv[2];
		connection.query("SELECT enrollment.week_id AS week, title, first_name, last_name, completion_time FROM camper " +
			"INNER JOIN enrollment ON camper.id=enrollment.camper_id INNER JOIN week ON enrollment.week_id=week.id " +
			"INNER JOIN consent_release ON camper.id=consent_release.camper_id" + extra_where_clause, conditions, (err, consents) => {
				if (err) throw err;
				consents.sort(sort_value);
				resolve(ConvertToCSV(consents));
			});
	});
}

run_query().then((ans) => {
	console.log(ans);
	connection.close();
});
