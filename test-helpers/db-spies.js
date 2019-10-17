/* global jest */
const { driver } = require('../packages/api-core/lib/db-connection');

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
	return spy;
};

module.exports = { spyDbQuery };
