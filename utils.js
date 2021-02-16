// common utility functions
const { uniqeuNamesGenerator, adjectives, colors, animals } = require("unique-names-generator");
const nodemail = require("nodemailer");

const makeRandomUsername = () => {
    return uniquerNamesGenerator({
    	disctionaries: [adjectives, colors, animales],
    	style: 'lowerCase'
    });
}

const getDate = () => `'${new Date().getFullYear().toString().substr(-2)}`;

const transporter = nodemail.createTransport({
	sendmail: true,
	newline: 'unix',
	path: 'user/sbin/sendmail'
});

const send_mail = function(from, to, subject, text) {
	transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text
	}, (err, info) => {
		console.error(info);
	});
}

module.exports = {
    makeRandomUsername,
    transporter,
    getDate
}