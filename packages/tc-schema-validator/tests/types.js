/* global it, describe, expect */
const fs = require('fs');
const path = require('path');
const { SDK, readYaml } = require('@financial-times/tc-schema-sdk');
const { typeTestSuite, relationshipTestSuite } = require('./type-test-suite');

const sdk = new SDK();

const types = sdk.rawData.getTypes();

const isRichRelationshipType = type => 'from' in type || 'to' in type;

describe('types', () => {
	fs.readdirSync(
		path.join(
			process.cwd(),
			process.env.TREECREEPER_SCHEMA_DIRECTORY,
			'types',
		),
	)
		.filter(fileName => /\.yaml$/.test(fileName))
		.forEach(fileName => {
			it(`${fileName} has consistent name property`, () => {
				const contents = readYaml.file(
					process.env.TREECREEPER_SCHEMA_DIRECTORY,
					path.join('types', fileName),
				);
				expect(`${contents.name}.yaml`).toBe(fileName);
			});
		});

	types.forEach(type => {
		if (isRichRelationshipType(type)) {
			relationshipTestSuite(types, type);
		} else {
			typeTestSuite(types, type);
		}
	});
});
