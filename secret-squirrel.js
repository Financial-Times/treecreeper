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
			'me@here\\.com', // docs/treecreeper-graphql.md:15
			'populateCuriousParent1RelationshipFields', // packages/tc-ui/src/primitives/relationship/__tests__/e2e-annotate-rich-relationships.cyp.js:17|17|277|277, packages/tc-ui/src/test-helpers/cypress.js:424|424|467|467
			'populateCuriousParent2RelationshipFields' // packages/tc-ui/src/primitives/relationship/__tests__/e2e-annotate-rich-relationships.cyp.js:18|18|286|286, packages/tc-ui/src/test-helpers/cypress.js:429|429|468|468
		]
	}
};
