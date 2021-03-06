const crypto = require('crypto');
const fs = require('fs');

const chunk_size = 64;

module.exports = {
	chunk_encrypt: (item_encrypt) => {
		return crypto.publicEncrypt(process.env.CRYPTO_PUBLIC, Buffer.from(item_encrypt)).toString('base64');
	},
	encrypt: (item_encrypt) => {
		let cryptoString = '';
	        for (let index = 0; index < item_encrypt.length - 1; index += chunk_size)
                	cryptoString += module.exports.chunk_encrypt(item_encrypt.slice(index, index + chunk_size));
		return cryptoString;
	}
};
