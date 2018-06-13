const readYaml = require('../../schema/lib/read-yaml');
const { expect } = require('chai');
const relationships = readYaml.file('schema/rules/relationships.yaml');
const {
	typesSchema,
	stringPatterns: { RELATIONSHIP_NAME, ATTRIBUTE_NAME }
} = require('../../schema');

describe('schema - relationships', () => {
	const validTypes = typesSchema.map(t => t.name);

	describe('raw data', () => {
		Object.entries(relationships).forEach(([cypherName, definitions]) => {
			describe(cypherName, () => {
				const normalisedDefinitions = Array.isArray(definitions)
					? definitions
					: [definitions];
				it('has a constant-case neo4j relationship name', () => {
					expect(cypherName).to.match(RELATIONSHIP_NAME);
				});

				it('is an array of definitions or a single definition', () => {
					normalisedDefinitions.forEach(({ type, fromType, toType }) => {
						expect(type).to.exist;
						expect(fromType).to.exist;
						expect(toType).to.exist;
					});
				});

				const validateNode = node => {
					it('uses valid node type', () => {
						expect(Object.keys(node).length).to.equal(1);
						expect(Object.keys(node)[0]).to.be.oneOf(validTypes);
					});
					it('uses valid graphql property name', () => {
						expect(Object.values(node)[0].graphql.name).to.match(
							ATTRIBUTE_NAME
						);
					});
					it('has graphql description', () => {
						expect(Object.values(node)[0].graphql.description).to.be.a(
							'string'
						);
					});
				};
				normalisedDefinitions.forEach(({ type, fromType, toType }) => {
					it('defines valid cardinality type', () => {
						expect(type).to.be.oneOf([
							'ONE_TO_ONE',
							'ONE_TO_MANY',
							'MANY_TO_ONE',
							'MANY_TO_MANY'
						]);
					});
					describe('toType', () => validateNode(toType));
					describe('fromType', () => validateNode(fromType));
				});
			});
		});
	});

	describe.skip('constructed schema', () => {});
});
