/* global jest */
const { driver } = require('@financial-times/tc-api-db-manager');

const spyDbQuery = () => {
	const originalSession = driver.session.bind(driver);
	const spy = jest.fn();
	jest.spyOn(driver, 'session').mockImplementation(() => {
		const session = originalSession();
		const originalRun = session.run.bind(session);
		session.run = (...args) => {
			spy(...args);
			return originalRun(...args);
		};
		return session;
	});
	return spy;
};

module.exports = { spyDbQuery };
