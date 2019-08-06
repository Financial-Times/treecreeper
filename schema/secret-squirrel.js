module.exports = {
	files: {
		allow: [
			'Makefile-temp'
		],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'dd4c5d856812e0fb8c705feeabffd754', //gist link in readme
			'e4d77800-5cab-11e9-8713-8d0ea7485108' // image in readme
		]
	}
};
