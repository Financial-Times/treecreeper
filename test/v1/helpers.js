const sinon = require('sinon');
const { expect } = require('chai');
const logger = require('@financial-times/n-logger').default;
const { executeQuery, driver } = require('../../server/data/db-connection');
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
			executeQuery(`CREATE (n:${type} $node) RETURN n`, { node })
		)
	);
	if (withRelationships) {
		await executeQuery(`MATCH (t:Team { code: "test-team" }), (p:Person { code: "test-person" }), (g:Group { code: "test-group" })
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
			await executeQuery(
				`MATCH (n:${type} { code: "${node.code}" }) DETACH DELETE n`
			);
		})
	);
};

const setupMocks = (state, { withRelationships, withDb = true } = {}) => {
	if (withDb) {
		// clean up after potentially failed test runs
		before(dropDb);
	}

	beforeEach(async () => {
		state.sandbox = sinon.createSandbox();
		state.stubSendEvent = stubKinesis(state.sandbox);
		if (withDb) {
			await hydrateDb(withRelationships);
		}
	});

	afterEach(async () => {
		state.sandbox.restore();
		if (withDb) {
			await dropDb();
		}
	});
};

const stubDbUnavailable = state =>
	state.sandbox.stub(driver, 'session').returns({
		run: () => {
			throw 'oh no';
		},
		close: () => {}
	});

const stubDbTransaction = (state, properties = {}) => {
	const runStub = state.sandbox.stub();
	const dummyInteger = { equals: () => false };
	runStub.resolves({
		records: [
			{
				get: () => ({
					properties,
					labels: [],
					identity: dummyInteger,
					start: dummyInteger,
					end: dummyInteger
				}),
				has: () => false
			}
		]
	});
	const stubSession = {
		run: runStub,
		writeTransaction: func => func(stubSession),
		close: () => {}
	};
	state.sandbox.stub(driver, 'session').returns(stubSession);
	return runStub;
};

const spyDbQuery = state => {
	const originalSession = driver.session.bind(driver);
	let spy;
	state.sandbox.stub(driver, 'session').callsFake(() => {
		const session = originalSession();
		state.sandbox.spy(session, 'run');
		spy = session.run;
		return session;
	});
	return () => spy;
};

const getRelationship = (relType = 'HAS_TECH_LEAD') =>
	executeQuery(`
			MATCH (node:Team { code: 'test-team' })-[relationship:${relType}]->(relatedNode:Person { code: 'test-person' })
			RETURN relationship`);

module.exports = {
	checkResponse,
	stubKinesis,
	setupMocks,
	stubDbTransaction,
	stubDbUnavailable,
	spyDbQuery,
	getRelationship
};
