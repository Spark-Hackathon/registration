const crypto = require('crypto');
const fs = require('fs');

module.exports = {
	chunk_decrypt: (item_decrypt) => {
		return crypto.privateDecrypt(process.env.CRYPTO_PRIVATE, Buffer.from(item_decrypt, 'base64')).toString('utf8');
	},

	decrypt: (item_decrypt) => {
		let decipherString = "";
		let chunks = item_decrypt.split("==");
		console.log(chunks);
		chunks.forEach((chunk) => {
			decipherString += chunk.length ? module.exports.chunk_decrypt(chunk + "==") : '';
		});
		return decipherString;
	}
}
