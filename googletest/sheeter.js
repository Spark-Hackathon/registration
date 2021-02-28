const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');
require('dotenv').config({
	path: path.resolve(__dirname, '../.env')
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);

async function sheet() {

	await doc.useServiceAccountAuth({
		client_email: process.env.GOOGLE_CLIENT_EMAIL,
		private_key: process.env.GOOGLE_PRIVATE_KEY,
	});
	await doc.loadInfo();
	const sheet = await doc.sheetsByIndex[0];

	await sheet.clear();
	await sheet.setHeaderRow(["name", "hotness"]);

	await sheet.addRows([ {name: 'Ritsuka-kun', hotness: 5}, {name: 'Yayoi', hotness:2}]);

	for (let i = 0; i < 10; i++) {
		await sheet.addRow({name: Math.random(), hotness: Math.random() });
	}

	console.log("dun");

}

sheet();
