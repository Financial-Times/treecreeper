const { driver } = require('../../../packages/tc-api-db-manager');

const spyDbQuery = ({ sinon }) => {
	const originalSession = driver.session.bind(driver);
	let spy;
	sinon.stub(driver, 'session').callsFake(() => {
		const session = originalSession();
		if (!spy) {
			sinon.spy(session, 'run');
			spy = session.run;
		} else {
			session.run = spy;
		}
		return session;
	});
	return () => spy;
};

const stubDbUnavailable = ({ sinon }) =>
	sinon.stub(driver, 'session').returns({
		run: () => {
			throw new Error('oh no');
		},
		close: () => {},
	});

const stubDbTransaction = ({ sinon }, properties = {}) => {
	const runStub = sinon.stub();
	const dummyId = { equals: () => false };
	runStub.resolves({
		records: [
			{
				get: () => ({
					properties,
					labels: [],
					identity: dummyId,
					start: dummyId,
					end: dummyId,
				}),
				has: () => false,
			},
		],
	});
	const stubSession = {
		run: runStub,
		writeTransaction: func => func(stubSession),
		close: () => {},
	};
	sinon.stub(driver, 'session').returns(stubSession);
	return runStub;
};

module.exports = {
	spyDbQuery,
	stubDbUnavailable,
	stubDbTransaction,
};