const {
	GoogleSpreadsheet
} = require('google-spreadsheet');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({
	path: path.resolve(__dirname, '../.env')
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
	connection.query("SELECT * FROM week", async (err, week_meta) => {
		if (err) throw err;
		async function setup_week(id, title, index) {
			return new Promise(async (full_resolve, full_reject) => {
				//going through each week -- make registered, then applicants sheet, then roll from there
				//select the campers for that week
				connection.query("SELECT * FROM camper INNER JOIN enrollment ON camper.id = enrollment.camper_id && enrollment.week_id=?", id, async (err, camper_meta) => {
					if (err) full_reject(err);
					setTimeout(async () => {
						const registered_sheet = await doc.addSheet({
							title: id + " " + title + " Registered",
							headerValues: Object.keys(camper_meta[0])
						});
						const applicants_sheet = await doc.addSheet({
							title: id + " " + title + " Applicants",
							headerValues: Object.keys(camper_meta[0])
						});
						if (index == 0) await first_row.delete();
						//now run through the campers, and drop all of their info into that specific week - NEED TO LOOK AT ENROLLMENT VALUES
						let camper_push = camper_meta.map(async (camper_item, camper_index) => {
							return new Promise(async (camper_resolve, camper_reject) => {
								if (camper_item.approved == 1) await registered_sheet.addRow(camper_item);
								if (camper_item.approved == 0) await applicants_sheet.addRow(camper_item);
								camper_resolve();
							});
						});
						await Promise.all(camper_push);
						full_resolve(["done", id, title, index]);
					}, (0.001 * camper_meta.length + 1) * 5000 * index);
				});
			});
		}
		week_meta.forEach(async (item, index) => {
			let week_value = await setup_week(item.id, item.title, index);
			if (index == week_meta.length - 1) {
				console.log("sheet? dun");
			}
		});
	});
}

sheet();