/* global jest */

// eslint-disable-next-line import/no-extraneous-dependencies
const { driver } = require('@financial-times/tc-api-db-manager');

const spyDbQuery = () => {
	const originalSession = driver.session.bind(driver);
	let spy;
	jest.spyOn(driver, 'session').mockImplementation(() => {
		const session = originalSession();
		jest.spyOn(session, 'run');
		if (!spy) {
			jest.spyOn(session, 'run');
			spy = session.run;
		} else {
			session.run = spy;
		}
		return session;
	});
	// We have to wrap function in order to trap `spy` variable in this scope
	// and return lazy affected spy variable properly
	return () => spy;
};

module.exports = { spyDbQuery };
