const { driver } = require('../../../server/data/db-connection');

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
			throw 'oh no';
		},
		close: () => {}
	});

const stubDbTransaction = ({ sinon }, properties = {}) => {
	const runStub = sinon.stub();
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
	sinon.stub(driver, 'session').returns(stubSession);
	return runStub;
};

module.exports = {
	spyDbQuery,
	stubDbUnavailable,
	stubDbTransaction
};
