const sinon = require('sinon');
const { expect } = require('chai');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../../server/db-connection');
const EventLogWriter = require('../../server/lib/event-log-writer');

const checkResponse = (actual, expected) => {
	expect(actual.node).to.eql(expected.node);
	if (expected.relationships) {
		const expectedTypes = Object.keys(expected.relationships);
		const actualTypes = Object.keys(expected.relationships);
		expect(actualTypes.length).to.equal(expectedTypes.length);
		if (expectedTypes.length) {
			expectedTypes.forEach(type => {
				expect(actual.relationships[type]).to.have.deep.members(
					expected.relationships[type]
				);
			});
		} else {
			expect(actual.relationships).to.eql({});
		}
	}
};

const stubKinesis = sandbox =>
	sandbox.stub(EventLogWriter.prototype, 'sendEvent').callsFake(data => {
		logger.debug('Event log stub sendEvent called', { event: data.event });
		return Promise.resolve();
	});

const nodes = Object.freeze([
	Object.freeze({
		type: 'System',
		node: Object.freeze({
			code: 'test-system',
			foo: 'bar1'
		})
	}),
	Object.freeze({
		type: 'Person',
		node: Object.freeze({
			code: 'test-person',
			foo: 'bar2'
		})
	}),
	Object.freeze({
		type: 'Group',
		node: Object.freeze({
			code: 'test-group',
			foo: 'bar3'
		})
	})
]);

const hydrateDb = async withRelationships => {
	await Promise.all(
		nodes.map(({ type, node }) =>
			db.run(`CREATE (n:${type} $node) RETURN n`, { node })
		)
	);
	if (withRelationships) {
		await db.run(`MATCH (s:System { code: "test-system" }), (p:Person { code: "test-person" }), (g:Group { code: "test-group" })
									MERGE (g)-[o:OWNS]->(s)-[t:HAS_TECH_LEAD]->(p)
									SET
										o._createdByRequest = "setup-script",
										o._createdByClient = "setup-client-script",
										o._createdTimestamp = "12345",
										t._createdByRequest = "setup-script",
										t._createdByClient = "setup-client-script",
										t._createdTimestamp = '12345'
									RETURN g, o, s, t, p`);
	}
};

const dropDb = async () => {
	await Promise.all(
		nodes.map(async ({ type, node }) => {
			await db.run(
				`MATCH (n:${type} { code: "${node.code}" }) DETACH DELETE n`
			);
		})
	);
};

const setupMocks = (state, { withRelationships } = {}) => {
	// clean up after potentially failed test runs
	before(dropDb);

	beforeEach(async () => {
		state.sandbox = sinon.sandbox.create();
		state.stubSendEvent = stubKinesis(state.sandbox);
		await hydrateDb(withRelationships);
	});

	afterEach(async () => {
		state.sandbox.restore();
		await dropDb();
	});
};

const getRelationship = (relType = 'HAS_TECH_LEAD') =>
	db.run(`
			MATCH (node:System { code: 'test-system' })-[relationship:${relType}]->(relatedNode:Person { code: 'test-person' })
			RETURN relationship`);

module.exports = {
	checkResponse,
	stubKinesis,
	setupMocks,
	getRelationship
};
