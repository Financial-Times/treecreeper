const primitiveTypesMap = require('../../lib/primitive-types-map');
const { SDK } = require('../../sdk');
const { readYaml } = require('../../lib/updater');

const stringPatterns = readYaml.file(
	process.env.TREECREEPER_SCHEMA_DIRECTORY,
	'string-patterns.yaml',
);

const graphqlFromRawData = schema => {
	return new SDK({ schemaData: { schema } }).getGraphqlDefs();
};

const explodeString = str =>
	str
		.split('\n')
		// exclude strings which are just whitespace or empty
		.filter(string => !/^[\s]*$/.test(string))
		.map(string => string.trim());

const expectedGraphqlSchemaString = `
directive @deprecated(
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION

scalar DateTime
scalar Date
scalar Time
"""
A cost centre which groups are costed to
"""
type CostCentre {

"""
Unique code/id for this item
"""
code: String
"""
The name of the cost centre
"""
name: String
"""
The groups which are costed to the cost centre
"""
hasGroups(first: Int, offset: Int): [Group] @relation(name: "PAYS_FOR", direction: "OUT")
"""
The recursive groups which are costed to the cost centre
"""
hasNestedGroups(first: Int, offset: Int): [Group] @cypher(statement: "MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related")

"""
The client that was used to make the creation
"""
_createdByClient: String
"""
The user that made the creation
"""
_createdByUser: String
"""
The time and date this record was created
"""
_createdTimestamp: DateTime
"""
The client that was used to make the update
"""
_updatedByClient: String
"""
The last user to make an update
"""
_updatedByUser: String
"""
The time and date this record was last updated
"""
_updatedTimestamp: DateTime
"""
Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
"""
_lockedFields: String
"""
The groups which are costed to the cost centre
*NOTE: This gives access to properties on the relationships between records
as well as on the records themselves. Use 'hasGroups' instead if you do not need this*
"""
hasGroups_rel(first: Int, offset: Int): [CostcentrePaysForGroup]
}

"""
An overarching group which contains teams and is costed separately
"""
type Group {

"""
Unique code/id for this item
"""
code: String
"""
The name of the group
"""
name: String
"""
Whether or not the group is still in existence
"""
isActive: Boolean

"""
The Cost Centre associated with the group
"""
hasBudget: CostCentre @relation(name: "PAYS_FOR", direction: "IN")

"""
The client that was used to make the creation
"""
_createdByClient: String
"""
The user that made the creation
"""
_createdByUser: String
"""
The time and date this record was created
"""
_createdTimestamp: DateTime
"""
The client that was used to make the update
"""
_updatedByClient: String
"""
The last user to make an update
"""
_updatedByUser: String
"""
The time and date this record was last updated
"""
_updatedTimestamp: DateTime
"""
Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
"""
_lockedFields: String
"""
The Cost Centre associated with the group
*NOTE: This gives access to properties on the relationships between records
as well as on the records themselves. Use 'hasBudget' instead if you do not need this*
"""
hasBudget_rel: CostcentrePaysForGroup
}
"""
Internal use only
"""
type CostcentrePaysForGroup @relation(name: PAYS_FOR) {
from: CostCentre
to: Group
}
type Query {
"""
A cost centre which groups are costed to
"""
CostCentre(

"""
Unique code/id for this item
"""
code: String
"""
The name of the cost centre
"""
name: String
): CostCentre

"""
A cost centre which groups are costed to
"""
CostCentres(

"""
The pagination offset to use
"""
offset: Int = 0
"""
The number of records to return after the pagination offset. This uses the default neo4j ordering
"""
first: Int = 20000
"""
Unique code/id for this item
"""
code: String
"""
The name of the cost centre
"""
name: String

"""
The client that was used to make the creation
"""
_createdByClient: String
"""
The user that made the creation
"""
_createdByUser: String
"""
The time and date this record was created
"""
_createdTimestamp: DateTime
"""
The client that was used to make the update
"""
_updatedByClient: String
"""
The last user to make an update
"""
_updatedByUser: String
"""
The time and date this record was last updated
"""
_updatedTimestamp: DateTime
"""
Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
"""
_lockedFields: String
): [CostCentre]

"""
An overarching group which contains teams and is costed separately
"""
Group(

"""
Unique code/id for this item
"""
code: String
"""
The name of the group
"""
name: String
): Group

"""
An overarching group which contains teams and is costed separately
"""
Groups(

"""
The pagination offset to use
"""
offset: Int = 0
"""
The number of records to return after the pagination offset. This uses the default neo4j ordering
"""
first: Int = 20000
"""
Unique code/id for this item
"""
code: String
"""
The name of the group
"""
name: String
"""
Whether or not the group is still in existence
"""
isActive: Boolean
"""
The client that was used to make the creation
"""
_createdByClient: String
"""
The user that made the creation
"""
_createdByUser: String
"""
The time and date this record was created
"""
_createdTimestamp: DateTime
"""
The client that was used to make the update
"""
_updatedByClient: String
"""
The last user to make an update
"""
_updatedByUser: String
"""
The time and date this record was last updated
"""
_updatedTimestamp: DateTime
"""
Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
"""
_lockedFields: String
): [Group]
}
"""
The lifecycle stage of a product
"""
enum Lifecycle {
"""
Incubate description
"""
Incubate
"""
Sustain description
"""
Sustain
"""
Grow description
"""
Grow
"""
Sunset description
"""
Sunset
}
"""
Quality rating based on Red, Amber and Green.
"""
enum TrafficLight {
Red
Amber
Green
}
`;

describe('graphql def creation', () => {
	it('generates expected graphql def given schema', () => {
		const schema = {
			types: [
				{
					name: 'CostCentre',
					description: 'A cost centre which groups are costed to',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the cost centre',
						},
						hasGroups: {
							type: 'Group',
							relationship: 'PAYS_FOR',
							direction: 'outgoing',
							hasMany: true,
							description:
								'The groups which are costed to the cost centre',
						},
						hasNestedGroups: {
							type: 'Group',
							hasMany: true,
							cypher:
								'MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related',
							description:
								'The recursive groups which are costed to the cost centre',
						},
					},
				},
				{
					name: 'Group',
					description:
						'An overarching group which contains teams and is costed separately',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the group',
						},
						isActive: {
							type: 'Boolean',
							description:
								'Whether or not the group is still in existence',
						},
						hasBudget: {
							type: 'CostCentre',
							relationship: 'PAYS_FOR',
							direction: 'incoming',
							description:
								'The Cost Centre associated with the group',
						},
					},
				},
			],
			enums: {
				Lifecycle: {
					description: 'The lifecycle stage of a product',
					options: {
						Incubate: 'Incubate description',
						Sustain: 'Sustain description',
						Grow: 'Grow description',
						Sunset: 'Sunset description',
					},
				},
				TrafficLight: {
					description:
						'Quality rating based on Red, Amber and Green.',
					options: ['Red', 'Amber', 'Green'],
				},
			},
			stringPatterns,
		};

		const generated = [].concat(
			...graphqlFromRawData(schema).map(explodeString),
		);
		expect(generated).toEqual(explodeString(expectedGraphqlSchemaString));
	});

	it('generates expected graphql def given schema using rich relationships', () => {
		const schema = {
			types: [
				{
					name: 'CostCentre',
					description: 'A cost centre which groups are costed to',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the cost centre',
						},
						hasGroups: {
							type: 'PaysFor',
							description:
								'The groups which are costed to the cost centre',
						},
						hasNestedGroups: {
							type: 'Group',
							hasMany: true,
							cypher:
								'MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related',
							description:
								'The recursive groups which are costed to the cost centre',
						},
					},
				},
				{
					name: 'Group',
					description:
						'An overarching group which contains teams and is costed separately',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the group',
						},
						isActive: {
							type: 'Boolean',
							description:
								'Whether or not the group is still in existence',
						},
						hasBudget: {
							type: 'PaysFor',
							description:
								'The Cost Centre associated with the group',
						},
					},
				},
			],
			relationshipTypes: [
				{
					name: 'PaysFor',
					relationship: 'PAYS_FOR',
					from: {
						type: 'CostCentre',
						hasMany: false,
					},
					to: {
						type: 'Group',
						hasMany: true,
					},
				},
			],
			enums: {
				Lifecycle: {
					description: 'The lifecycle stage of a product',
					options: {
						Incubate: 'Incubate description',
						Sustain: 'Sustain description',
						Grow: 'Grow description',
						Sunset: 'Sunset description',
					},
				},
				TrafficLight: {
					description:
						'Quality rating based on Red, Amber and Green.',
					options: ['Red', 'Amber', 'Green'],
				},
			},
			stringPatterns,
		};

		const generated = [].concat(
			...graphqlFromRawData(schema).map(explodeString),
		);
		expect(generated).toEqual(explodeString(expectedGraphqlSchemaString));
	});

	describe('deprecation', () => {
		it('can deprecate a property', () => {
			const schema = {
				types: [
					{
						name: 'Fake',
						description: 'Fake type description',
						properties: {
							prop: {
								type: 'Boolean',
								deprecationReason: 'not needed',
								description: 'a description',
							},
						},
					},
				],
				enums: {},
				stringPatterns,
			};
			const generated = [].concat(...graphqlFromRawData(schema)).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop: Boolean  @deprecated(reason: "not needed")',
			);
		});

		it('can deprecate a relationship property', () => {
			const schema = {
				types: [
					{
						name: 'Fake',
						description: 'Fake type description',
						properties: {
							prop: {
								type: 'FakeRel',
								deprecationReason: 'not needed',
								description: 'a description',
								direction: 'from',
							},
						},
					},
				],
				relationshipTypes: [
					{
						name: 'FakeRel',
						relationship: 'HAS',
						from: {
							type: 'Fake',
							hasMany: true,
						},
						to: {
							type: 'Fake',
							hasMany: true,
						},
						isMutal: true,
					},
				],
				enums: {},
				stringPatterns,
			};
			const generated = [].concat(...graphqlFromRawData(schema)).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop(first: Int, offset: Int): [Fake] @relation(name: "HAS", direction: "OUT") @deprecated(reason: "not needed")',
			);
		});
	});

	describe('converting types', () => {
		Object.entries(primitiveTypesMap).forEach(
			([bizopsType, graphqlType]) => {
				it(`Outputs correct type for properties using ${bizopsType}`, () => {
					const schema = {
						types: [
							{
								name: 'Fake',
								description: 'Fake type description',
								properties: {
									prop: {
										type: bizopsType,
										description: 'a description',
									},
								},
							},
						],
						enums: {},
						stringPatterns,
					};
					const generated = []
						.concat(...graphqlFromRawData(schema))
						.join('');

					expect(generated).toMatch(
						new RegExp(`prop: ${graphqlType}`),
					);
				});
			},
		);
	});
});
