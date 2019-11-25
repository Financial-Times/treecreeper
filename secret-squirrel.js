module.exports = {
	files: {
		allow: [
			'scripts/neo4j-plugins',
			'scripts/neo4j-wait-for-start'
		],
		allowOverrides: []
	},
	strings: {
		deny: [],
		denyOverrides: [
			'dd4c5d856812e0fb8c705feeabffd754', //gist link in readme
			'e4d77800-5cab-11e9-8713-8d0ea7485108', // image in readme
			'support@graphenedb.com', // support email address from runbook
			'd5deb97d-5fa2-45f2-99fa-cd155328320d', // uuid for biz-ops-api dashboard url
			'dba88780-1a7d-11e9-9f6b-e867440c3985', // README.md:4
			'32e6ad1a-210f-11e8-89cc-978cb917c4e7', // doc/MODEL.md:5
			'396e2a98-1d16-11e8-87fd-7f7eb4f8a221', // doc/MODEL.md:11
			'33cba7fc-1d19-11e8-8417-7c85b306fa17', // doc/MODEL.md:21
			'd5deb97d-5fa2-45f2-99fa-cd155328320d', // doc/db-upgrade.md:67
			'tech@lt\\.com', // scripts/load-testing/lib/generate/team.js:29
			'email@example.com' // test/v2/node-patch.spec.js:1812|1839
		]
	}
};
