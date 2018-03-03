module.exports = {
	files: {
		allow: ['doc/model.grass'],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'31a7bb06-1cb4-11e8-8f18-453252bdbbc3', // MODEL.md:5, doc/MODEL.md:5
			'396e2a98-1d16-11e8-87fd-7f7eb4f8a221', // MODEL.md:11, doc/MODEL.md:11
			'33cba7fc-1d19-11e8-8417-7c85b306fa17', // MODEL.md:21, doc/MODEL.md:21
			'tddab40e000000caszsa0', // tests/submission.spec.js:41|44|49|58
			'e@mail\\.com' // tests/supplier.spec.js:13|16|19|22|25
		]
	}
};
