const { expect } = require('chai');
const { typesSchema, relationshipsSchema } = require('../../schema');

describe('(lack of) graphql clashes', () => {
	typesSchema.forEach(type => {
		describe(type.name, () => {
			it('has no graphql property name clashes', () => {
				if (relationshipsSchema[type.name]) {
					const ownProperties = Object.keys(type.properties);
					const relationshipProperties = relationshipsSchema[type.name]
						.map(def => def.name)
						// allow for relationships that are not exposed in graphQL
						.filter(name => !!name);

					expect(
						[...new Set([...ownProperties, ...relationshipProperties])].length
					).to.equal(ownProperties.concat(relationshipProperties).length);
				}
			});
		});
	});
});
