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

module.exports = {
    makeRandomUsername,
    getDate
}