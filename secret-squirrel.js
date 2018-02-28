module.exports = {
	files: {
		allow: [],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'213cddd4-1c80-11e8-9f27-b636e7be4bca', // MODEL.md:5
			'tddab40e000000caszsa0', // tests/submission.spec.js:41|44|49|58
			'e@mail\\.com' // tests/supplier.spec.js:13|16|19|22|25
		]
	}
};
