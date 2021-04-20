const {
	GoogleSpreadsheet
} = require('google-spreadsheet');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({
	path: path.resolve(path.join(__dirname, '../.env'))
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);

const connection = mysql.createConnection({
	host: process.env.HOST,
	database: process.env.DATABASE,
	user: process.env.DB_USER,
	password: process.env.PASSWORD,
	insecureAuth: false
});

connection.connect((err) => {
	if (err) throw err;
});

async function sheet() {
	return new Promise(async (total_resolve) => {
		await doc.useServiceAccountAuth({
			client_email: process.env.GOOGLE_CLIENT_EMAIL,
			private_key: process.env.GOOGLE_PRIVATE_KEY,
		});
		await doc.loadInfo();
		//reset all of the sheets / delete all of them
		for (let end_ind = doc.sheetsByIndex.length - 1; end_ind > 0; end_ind--) {
			await doc.sheetsByIndex[end_ind].delete();
		}
		const first_row = await doc.sheetsByIndex[0];
		await first_row.updateProperties({
			title: "Spacing"
		});
		//start from page one --go through each week (from registered, then to applicants)
		return new Promise((resolve_query, reject_reject) => {
			connection.query("SELECT * FROM week ORDER BY id ASC", async (err, week_meta) => {
				if (err) throw err;
				async function setup_week(id, title, index, length) {
					return new Promise(async (full_resolve, full_reject) => {
						//going through each week -- make registered, then applicants sheet, then roll from there
						//select the campers for that week
						setTimeout(async () => {
							connection.query("SELECT * FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id && enrollment.week_id=?", id, async (err, camper_meta) => {
								if (err) console.log(err);
								const registered_sheet = await doc.addSheet({
									title: id + " " + title + " Registered",
									headerValues: Object.keys(camper_meta[0])
								});
								const applicants_sheet = await doc.addSheet({
									title: id + " " + title + " Applicants",
									headerValues: Object.keys(camper_meta[0])
								});
								if (index == 0) await first_row.delete();
								let campers = camper_meta.filter(camper => camper.approved == 1);
								let applicants = camper_meta.filter(applicant => applicant.approved == 0);
								await registered_sheet.addRows(campers);
								await applicants_sheet.addRows(applicants);
								//now run through the campers, and drop all of their info into that specific week - NEED TO LOOK AT ENROLLMENT VALUES
								full_resolve(["done", id, title, index]);
							});
						}, (0.001 * length + 1) * 5000 * index);
					});
				}
				Promise.all(week_meta.map((item, index) => {
					return new Promise((camper_enrollment_resolve, camper_enrollment_reject) => {
						connection.query("SELECT id FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id && enrollment.week_id=?", item.id, async (err, camper_meta) => {
							if (err) console.log(err);
							if (camper_meta) setup_week(item.id, item.title, index, camper_meta.length).then(() => {
								camper_enrollment_resolve();
							});
						});
					});
				})).then(() => {
					resolve_query();
				});
			});
		}).then(() => {
			total_resolve();
		});
	});
}

sheet().then(() => {
	console.log("dun");
	connection.close();
});

module.exports = sheet;
