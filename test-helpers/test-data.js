const { DateTime } = require('neo4j-driver/lib/v1/temporal-types.js');
const { driver } = require('../packages/api-core/lib/db-connection');

const executeQuery = (query, parameters) =>
	driver.session().run(query, parameters);

const getNodeCreator = (namespace, defaultProps) => async (
	type,
	props = {},
) => {
	if (typeof props === 'string') {
		props = { code: props };
	}
	const result = await executeQuery(`CREATE (n:${type} $props) RETURN n`, {
		props: Object.assign({}, defaultProps, props),
	});
	return result.records[0].get('n').identity;
};

const getConnector = (namespace, defaultProps) => (
	id1,
	relationshipType,
	id2,
	props = {},
) =>
	executeQuery(
		`
MATCH (n1) WHERE ID(n1) = toInteger($id1)
WITH n1
MATCH (n2) WHERE ID(n2) = toInteger($id2)
WITH n1, n2
MERGE (n1)-[rel:${relationshipType}]->(n2)
SET rel = $props
RETURN n1, n2, rel`,
		{
			id1,
			id2,
			props: Object.assign({}, defaultProps, props),
		},
	);

const testDataCreators = (namespace, sandbox, now, then) => {
	const formattedTimestamp = new Date(now).toISOString();

	const defaultCreateByMeta = {
		_createdByRequest: `${namespace}-default-request`,
		_createdByClient: `${namespace}-default-client`,
		_createdByUser: `${namespace}-default-user`,
		_createdTimestamp: DateTime.fromStandardDate(new Date(then)).toString(),
	};

	sandbox.meta = {
		default: Object.assign(
			{
				_updatedByRequest: `${namespace}-default-request`,
				_updatedByClient: `${namespace}-default-client`,
				_updatedByUser: `${namespace}-default-user`,
				_updatedTimestamp: DateTime.fromStandardDate(
					new Date(now),
				).toString(),
			},
			defaultCreateByMeta,
		),
		create: {
			_createdByClient: `${namespace}-client`,
			_createdByUser: `${namespace}-user`,
			_createdByRequest: `${namespace}-request`,
			_createdTimestamp: DateTime.fromStandardDate(
				new Date(formattedTimestamp),
			).toString(),
			_updatedByClient: `${namespace}-client`,
			_updatedByUser: `${namespace}-user`,
			_updatedByRequest: `${namespace}-request`,
			_updatedTimestamp: DateTime.fromStandardDate(
				new Date(formattedTimestamp),
			).toString(),
		},
		update: Object.assign(
			{
				_updatedByClient: `${namespace}-client`,
				_updatedByUser: `${namespace}-user`,
				_updatedByRequest: `${namespace}-request`,
				_updatedTimestamp: DateTime.fromStandardDate(
					new Date(formattedTimestamp),
				).toString(),
			},
			defaultCreateByMeta,
		),
	};

	const createNode = getNodeCreator(namespace, sandbox.meta.default);
	const connect = getConnector(namespace, sandbox.meta.default);

	sandbox.connectNodes = (...input) => {
		if (!Array.isArray(input[0])) {
			input = [input];
		}
		return Promise.all(input.map(args => connect(...args)));
	};
	sandbox.createNode = createNode;
	sandbox.createNodes = (...nodes) =>
		Promise.all(nodes.map(args => createNode(...args)));
};

const dropDb = namespace =>
	executeQuery(
		`MATCH (n) WHERE n.code CONTAINS "${namespace}" DETACH DELETE n`,
	);

module.exports = {
	testDataCreators,
	dropDb,
};
