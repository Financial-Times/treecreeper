const sinon = require('sinon');
const { expect } = require('chai');
const logger = require('@financial-times/n-logger').default;
const { safeQuery, driver } = require('../../server/db-connection');
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
		type: 'Team',
		node: Object.freeze({
			code: 'test-team',
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
			safeQuery(`CREATE (n:${type} $node) RETURN n`, { node })
		)
	);
	if (withRelationships) {
		await safeQuery(`MATCH (t:Team { code: "test-team" }), (p:Person { code: "test-person" }), (g:Group { code: "test-group" })
									MERGE (g)-[ht:HAS_TEAM]->(t)-[htl:HAS_TECH_LEAD]->(p)
									SET
										ht._createdByRequest = "setup-script",
										ht._createdByClient = "setup-client-script",
										ht._createdTimestamp = "12345",
										htl._createdByRequest = "setup-script",
										htl._createdByClient = "setup-client-script",
										htl._createdTimestamp = '12345'
									RETURN g, ht, t, htl, p`);
	}
};

const dropDb = async () => {
	await Promise.all(
		nodes.map(async ({ type, node }) => {
			await safeQuery(
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

const stubDbUnavailable = state =>
	state.sandbox.stub(driver, 'session').returns({
		run: () => {
			throw 'oh no';
		},
		close: () => {}
	});

const getRelationship = (relType = 'HAS_TECH_LEAD') =>
	safeQuery(`
			MATCH (node:Team { code: 'test-team' })-[relationship:${relType}]->(relatedNode:Person { code: 'test-person' })
			RETURN relationship`);

module.exports = {
	checkResponse,
	stubKinesis,
	setupMocks,
	stubDbUnavailable,
	getRelationship
};
