const crypto = require('crypto');
const fs = require('fs');

const privateKey = fs.readFileSync('privkey.priv', 'utf8');

module.exports = {
	chunk_decrypt: (item_decrypt) => {
		return crypto.privateDecrypt(privateKey, Buffer.from(item_decrypt, 'base64')).toString('utf8');
	},

	decrypt: (item_decrypt) => {
		let decipherString = "";
		let chunks = item_decrypt.split("==");
		chunks.forEach((chunk) => {
			decipherString += chunk.length ? module.exports.chunk_decrypt(chunk + "==") : '';
		});
		return decipherString;
	}
}

console.log(module.exports.decrypt("gMv/zeyZtNN+XCe+qyNqaQBGHUuclubR262lYPPKA75EskpHm0ljtRVljt1GPhFeYCJuSzXS/52iKSLf7lAjD/WYTgSEV84Al075D1Vbufo3Y4ru6KfeSI2c8odP8LwYTO3Ouf8KpQxBitaBohJBpbhNUs8YxruyLADoX48YmVdm7YERvxlNXGmFGfh27FcJf8BzKMdpb5KkcIB5nrp/AMy3hs+G38omvzscJjL1IV0qpqm6b8xM/oTIhD0ifBT9XtqX98TrhlnOacT1l0vx3xhEg8wMy2JUojgxrgFv61GyqpGDvhWJ82BYODsgOvKi8YnKgTo0XtatyjiFtlFJEyEGysS/4hxhPoE/XY3r5Kwlq3oUof4oEmr6zMFfGmQZnfm5e+sdmLgEq+Sun/DtlWTrEJPHf9+sHKcqlaLwpp4w7K05zFCTyN3CKp1b/HubHHcakg2g9DwqTtebJfFQrv/HVm8Mq0tPe8TJ8ZhqWIeYKipwnYH5Yz7fu7Lsx20g"));
