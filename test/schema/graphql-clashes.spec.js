const { expect } = require('chai');
const { typesSchema, relationshipsSchema } = require('../../schema');

describe('(lack of) graphql clashes', () => {
	typesSchema.forEach(type => {
		describe(type.name, () => {
			it('has no graphql property name clashes', () => {
				const ownProperties = Object.keys(type.properties);
				const relationshipProperties = relationshipsSchema[type.name].map(
					def => def.name
				);
				expect(
					[...new Set([...ownProperties, ...relationshipProperties])].length
				).to.equal(ownProperties.concat(relationshipProperties).length);
			});
		});
	});
});
