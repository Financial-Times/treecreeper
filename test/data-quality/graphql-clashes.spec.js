const { expect } = require('chai');
const { getTypes, getRelationships } = require('../..');

describe('(lack of) graphql clashes', () => {
	getTypes().forEach(type => {
		describe(type.name, () => {
			it('has no graphql property name clashes', () => {

				const ownProperties = Object.keys(type.properties);
				const relationshipProperties = getRelationships(type.name, {structure: 'graphql'})

				expect(
					[...new Set([...ownProperties, ...relationshipProperties])].length
				).to.equal(ownProperties.concat(relationshipProperties).length);
			});
		});
	});
});
