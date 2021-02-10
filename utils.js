// common utility functions
const { uniqeuNamesGenerator, adjectives, colors, animals } = require('unique-names-generator')

const makeRandomUsername = () => {
    return uniquerNamesGenerator({
    	disctionaries: [adjectives, colors, animales],
    	style: 'lowerCase'
    })
}

module.exports = {
    makeRandomUsername
}