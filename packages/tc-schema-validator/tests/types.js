/* global it, describe, expect */
const fs = require('fs');
const path = require('path');
const { SDK, readYaml } = require('@financial-times/tc-schema-sdk');
const { typeTestSuite, relationshipTestSuite } = require('./type-test-suite');

const sdk = new SDK();
const types = sdk.rawData.getTypes();

const makePath = dir =>
	path.join(process.cwd(), process.env.TREECREEPER_SCHEMA_DIRECTORY, dir);

describe('consistent name property', () => {
	describe('types', () => {
		fs.readdirSync(makePath('types'))
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
	});
	const relationshipsDir = makePath('relationships');
	if (fs.existsSync(relationshipsDir)) {
		describe('relationships', () => {
			fs.readdirSync(relationshipsDir)
				.filter(fileName => /\.yaml$/.test(fileName))
				.forEach(fileName => {
					it(`${fileName} has consistent name property`, () => {
						const contents = readYaml.file(
							process.env.TREECREEPER_SCHEMA_DIRECTORY,
							path.join('relationships', fileName),
						);
						expect(`${contents.name}.yaml`).toBe(fileName);
					});
				});
		});
	}
});

describe('validate types', () => {
	types.filter(({ from, to }) => !from && !to).forEach(typeTestSuite);
});

describe('validate rich relationships', () => {
	types
		.filter(({ from, to }) => !!from && !!to)
		.forEach(relationshipTestSuite);
});
