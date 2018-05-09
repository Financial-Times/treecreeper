module.exports = {
	files: {
		allow: [
			'doc/model.cql',
			'doc/model.grass',
			'scripts/neo4j-plugins',
			'scripts/neo4j-wait-for-start',
			'server/graphQl/typeDefs.graphql'
		],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'32e6ad1a-210f-11e8-89cc-978cb917c4e7', // doc/MODEL.md:5
			'396e2a98-1d16-11e8-87fd-7f7eb4f8a221', // doc/MODEL.md:11
			'33cba7fc-1d19-11e8-8417-7c85b306fa17', // doc/MODEL.md:21
			'tddaB4L00000008TU1KAM', // tests/fixtures/contract.get.js:57|767
			'pciaB4L00000008TU1KAM', // tests/fixtures/contract.get.js:127|774
			'abcaB4L00000008TU1KAM', // tests/fixtures/contract.get.js:337|795
			'tddaB4L00000008TStKAM', // tests/fixtures/contract.get.js:407|814
			'pciaB4L00000008TStKAM', // tests/fixtures/contract.get.js:477|821
			'abcaB4L00000008TStKAM' // tests/fixtures/contract.get.js:687|842
		]
	}
};
