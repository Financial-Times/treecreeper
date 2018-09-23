const { expect } = require('chai');
const generateGraphqlDefs = require('../../').getGraphqlDefs;
const sinon = require('sinon');
const rawData = require('../../lib/raw-data');
const cache = require('../../lib/cache');
const primitiveTypesMap = require('../../lib/primitive-types-map')

const explodeString = str =>
	str
		.split('\n')
		.filter(str => !/^[\s]*$/.test(str))
		.map(str => str.trim());

describe('graphql def creation', () => {
	let sandbox;
	beforeEach(() => {
		cache.clear();
		sandbox = sinon.createSandbox();
	});

	afterEach(() => {
		sandbox.restore();
		cache.clear();
	});

	it('generates expected graphql def given schema', () => {
		sandbox.stub(rawData, 'getTypes').returns([
			{
				name: 'CostCentre',
				description: 'A cost centre which groups are costed to',
				properties: {
					code: {
						type: 'String',
						required: true,
						unique: true,
						canIdentify: true,
						description: 'Unique code/id for this item',
						pattern: 'COST_CENTRE'
					},
					name: {
						type: 'String',
						canIdentify: true,
						description: 'The name of the cost centre'
					}
				}
			},
			{
				name: 'Group',
				description:
					'An overarching group which contains teams and is costed separately',
				properties: {
					code: {
						type: 'String',
						required: true,
						unique: true,
						canIdentify: true,
						description: 'Unique code/id for this item',
						pattern: 'COST_CENTRE'
					},
					name: {
						type: 'String',
						canIdentify: true,
						description: 'The name of the group'
					},
					isActive: {
						type: 'Boolean',
						canFilter: true,
						description: 'Whether or not the group is still in existence'
					}
				}
			}
		]);

		sandbox.stub(rawData, 'getRelationships').returns({
			PAYS_FOR: {
				cardinality: 'ONE_TO_MANY',
				fromType: {
					type: 'CostCentre',
					name: 'hasGroups',
					description: 'The groups which are costed to the cost centre',
					recursiveName: 'hasNestedGroups',
					recursiveDescription:
						'The recursive groups which are costed to the cost centre'
				},
				toType: {
					type: 'Group',
					name: 'hasBudget',
					description: 'The Cost Centre associated with the group',
					recursiveName: 'hasEventualBudget',
					recursiveDescription:
						'The Cost Centre associated with the group in the end'
				}
			}
		});

		sandbox.stub(rawData, 'getEnums').returns({
			Lifecycle: {
				description: 'The lifecycle stage of a product',
				options: ['Incubate', 'Sustain', 'Grow', 'Sunset']
			}
		});

		const generated = [].concat(...generateGraphqlDefs().map(explodeString));

		expect(generated).to.eql(
			explodeString(
				`
# A cost centre which groups are costed to
type CostCentre {

  # Unique code/id for this item
  code: String
  # The name of the cost centre
  name: String
	# The groups which are costed to the cost centre
	hasGroups(first: Int, offset: Int): [Group] @relation(name: \"PAYS_FOR\", direction: \"OUT\")
	# The recursive groups which are costed to the cost centre
	hasNestedGroups(first: Int, offset: Int): [Group] @cypher(
	statement: \"MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related\"
	)
}

# An overarching group which contains teams and is costed separately
type Group {

  # Unique code/id for this item
  code: String
  # The name of the group
  name: String
  # Whether or not the group is still in existence
  isActive: Boolean

	# The Cost Centre associated with the group
	hasBudget: CostCentre @relation(name: \"PAYS_FOR\", direction: \"IN\")
	# The Cost Centre associated with the group in the end
	hasEventualBudget: CostCentre @cypher(
	statement: \"MATCH (this)<-[:PAYS_FOR*1..20]-(related:CostCentre) RETURN DISTINCT related\"
	)

}
type Query {
    CostCentre(

    # Unique code/id for this item
    code: String
    # The name of the cost centre
    name: String
  ): CostCentre

  CostCentres(

    # The pagination offset to use
    offset: Int = 0
    # The number of records to return after the pagination offset. This uses the default neo4j ordering
    first: Int = 20000

  ): [CostCentre]

  Group(

    # Unique code/id for this item
    code: String
    # The name of the group
    name: String
  ): Group

  Groups(

    # The pagination offset to use
    offset: Int = 0
    # The number of records to return after the pagination offset. This uses the default neo4j ordering
    first: Int = 20000

    # Whether or not the group is still in existence
    isActive: Boolean
  ): [Group]
}
# The lifecycle stage of a product
enum Lifecycle {
  Incubate
  Sustain
  Grow
  Sunset
}

input SystemInput {
    serviceTier: ServiceTier
    name: String
    supported: Boolean
    primaryURL: String
    systemType: String
    serviceTier: ServiceTier
    serviceType: String
    hostPlatform: String
    personalData: Boolean
    sensitiveData: Boolean
    lifecycleStage: SystemLifecycle
}

type Mutation {
    System(code: String, params: SystemInput): System!
}`
			)
		);
	});

	describe('converting types', () => {
		Object.entries(primitiveTypesMap).forEach(([bizopsType, graphqlType])=> {
			it(`Outputs correct type for properties using ${bizopsType}`, () => {
				sandbox.stub(rawData, 'getTypes').returns([
					{
						name: 'Dummy',
						description: 'dummy type description',
						properties: {
							prop: {
								type: bizopsType,
								description: 'a description',
							}
						}
					}
				])
				sandbox.stub(rawData, 'getRelationships').returns({});
				sandbox.stub(rawData, 'getEnums').returns({});
				const generated = [].concat(...generateGraphqlDefs()).join('')


				expect(generated).to.match(new RegExp(`prop: ${graphqlType}`))
			})
		})

	})
});
