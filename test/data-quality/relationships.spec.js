const rawData = require('../../lib/raw-data');
const { expect } = require('chai');
const relationships = rawData.getRelationships();
const { getTypes } = require('../../');
const getStringPatterns = require('../../methods/get-string-patterns');
const RELATIONSHIP_NAME = getStringPatterns.method('RELATIONSHIP_NAME');
const ATTRIBUTE_NAME = getStringPatterns.method('ATTRIBUTE_NAME');

describe.only('data-quality: relationships', () => {
	const validTypes = getTypes().map(t => t.name);

	describe('raw data', () => {
		Object.entries(relationships).forEach(([neo4jName, definitions]) => {
			describe(neo4jName, () => {
				if (!Array.isArray(definitions)) {
					definitions = [definitions];
				}

				definitions.forEach(
					({ hideFromGraphql, cardinality, toType, fromType }) => {
						it('has a constant-case neo4j relationship name', () => {
							expect(neo4jName).to.match(RELATIONSHIP_NAME);
						});

						it('defines cardinality and end node types', () => {
							expect(cardinality).to.exist;
							expect(fromType).to.exist;
							expect(toType).to.exist;
						});

						const validateNode = node => {
							it('uses valid node type', () => {
								expect(node.type).to.be.oneOf(validTypes);
							});

							it('defines recursive or single level graphql properties', () => {
								expect(!!(node.name || node.recursiveName)).to.be.true;
							});

							if (node.recursiveName) {
								it('uses valid graphql recursive property name', () => {
									expect(node.recursiveName).to.match(ATTRIBUTE_NAME);
								});
								it('has graphql recursiveDescription', () => {
									expect(node.recursiveDescription).to.be.a('string');
								});
							}
							if (node.name) {
								it('uses valid graphql property name', () => {
									expect(node.name).to.match(ATTRIBUTE_NAME);
								});
								it('has graphql description', () => {
									expect(node.description).to.be.a('string');
								});
							}
						};
						it('defines valid cardinality type', () => {
							expect(cardinality).to.be.oneOf([
								'ONE_TO_ONE',
								'ONE_TO_MANY',
								'MANY_TO_ONE',
								'MANY_TO_MANY'
							]);
						});
						if (!hideFromGraphql) {
							describe(`toType: ${toType.type}`, () => validateNode(toType));
							describe(`fromType: ${fromType.type}`, () =>
								validateNode(fromType));
						}
					}
				);
			});
		});
	});
});
