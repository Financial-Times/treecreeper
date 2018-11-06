const { executeQuery } = require('../../../server/data/db-connection');

const getNodeCreator = (namespace, defaultProps) => async (
	type,
	props = {}
) => {
	if (typeof props === 'string') {
		props = { code: props };
	}
	const result = await executeQuery(`CREATE (n:${type} $props) RETURN n`, {
		props: Object.assign({}, defaultProps, props)
	});
	return result.records[0].get('n').identity.toInt();
};

const getConnector = (namespace, defaultProps) => (
	id1,
	relationshipType,
	id2,
	props = {}
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
			props: Object.assign({}, defaultProps, props)
		}
	);

const testDataCreators = (namespace, sandbox, formattedTimestamp) => {
	const setupMeta = {
		_createdByRequest: `${namespace}-init-request`,
		_createdByClient: `${namespace}-init-client`,
		_createdTimestamp: '12345',
		_updatedByRequest: `${namespace}-init-request`,
		_updatedByClient: `${namespace}-init-client`,
		_updatedTimestamp: '12345'
	};
	const createNode = getNodeCreator(namespace, setupMeta);
	const connect = getConnector(namespace, setupMeta);

	sandbox.connectNodes = (...input) => {
		if (!Array.isArray(input[0])) {
			input = [input];
		}
		return Promise.all(input.map(args => connect(...args)));
	};
	sandbox.createNode = createNode;
	sandbox.createNodes = (...nodes) =>
		Promise.all(nodes.map(args => createNode(...args)));

	sandbox.withMeta = (obj = {}) =>
		Object.assign(
			{
				_createdByRequest: `${namespace}-init-request`,
				_createdByClient: `${namespace}-init-client`,
				_createdTimestamp: '12345',
				_updatedByRequest: `${namespace}-init-request`,
				_updatedByClient: `${namespace}-init-client`,
				_updatedTimestamp: '12345'
			},
			obj
		);

	sandbox.withCreateMeta = (obj = {}) =>
		sandbox.withMeta(
			Object.assign(
				{
					_createdByClient: `${namespace}-client`,
					_createdByRequest: `${namespace}-request`,
					_createdTimestamp: formattedTimestamp,
					_updatedByClient: `${namespace}-client`,
					_updatedByRequest: `${namespace}-request`,
					_updatedTimestamp: formattedTimestamp
				},
				obj
			)
		);

	sandbox.withUpdateMeta = (obj = {}) =>
		sandbox.withMeta(
			Object.assign(
				{
					_updatedByClient: `${namespace}-client`,
					_updatedByRequest: `${namespace}-request`,
					_updatedTimestamp: formattedTimestamp
				},
				obj
			)
		);
};

const dropDb = namespace =>
	executeQuery(
		`MATCH (n) WHERE n.code STARTS WITH "${namespace}-" DETACH DELETE n`
	);

const testIsolatedNode = async (type, code, props) => {
	const { records } = await executeQuery(
		`MATCH (node:${type} { code: "${code}" }) RETURN node`
	);

	expect(records.length).toBe(1);
	expect(records[0].get('node').properties).toEqual(props);

	const { records: rels } = await executeQuery(
		`MATCH (node:${type} { code: "${code}" })-[r]-(n2) RETURN r`
	);

	expect(rels.length).toBe(0);
};

const testConnectedNode = async (type, code, props, relationships) => {
	const { records } = await executeQuery(
		`MATCH (node:${type} { code: "${code}" })-[rel]-(relatedNode)
		RETURN node, rel, relatedNode`
	);

	expect(records.length).toBe(relationships.length);

	expect(records[0].get('node').properties).toEqual(props);

	relationships.forEach(
		([
			{ type: relType, props: relProps, direction },
			{ type: relatedType, props: relatedProps }
		]) => {
			const record = records.find(record => {
				const relatedNode = record.get('relatedNode');
				const rel = record.get('rel');

				return (
					rel.type === relType &&
					relatedNode.labels[0] === relatedType &&
					relatedNode.properties.code === relatedProps.code &&
					// need either both things indicate outgoing, or both incoming
					// i.e. both true or both false
					(direction === 'outgoing') === rel.end.equals(relatedNode.identity)
				);
			});
			expect(record).toExist;
			expect(record.get('rel').properties).toEqual(relProps);
			expect(record.get('relatedNode').properties).toEqual(relatedProps);
		}
	);
};

const testNode = async (type, code, props, ...relationships) => {
	if (!relationships.length) {
		await testIsolatedNode(type, code, props);
	} else {
		await testConnectedNode(type, code, props, relationships);
	}
};

const verifyNotExists = async (type, code) => {
	const result = await executeQuery(
		`MATCH (n:${type} { code: "${code}" }) RETURN n`
	);
	expect(result.records.length).toBe(0);
};

const verifyExists = async (type, code) => {
	const result = await executeQuery(
		`MATCH (n:${type} { code: "${code}" }) RETURN n`
	);
	expect(result.records.length).toBe(1);
};

module.exports = {
	testDataCreators,
	dropDb,
	testDataCheckers: {
		testNode,
		testConnectedNode,
		verifyNotExists,
		verifyExists
	}
};
