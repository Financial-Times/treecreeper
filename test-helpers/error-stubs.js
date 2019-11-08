/* global  jest */
const { driver } = require('../packages/treecreeper-api-db-manager');

const asyncErrorFunction = async () => {
	throw new Error('oh no');
};

const originalSession = driver.session.bind(driver);

const dbUnavailable = ({ skip = 0 } = {}) => {
	jest.spyOn(driver, 'session').mockImplementation(() => {
		if (skip) {
			skip -= 1;
			return originalSession();
		}
		return {
			run: asyncErrorFunction,
			close: () => {},
		};
	});
};

module.exports = {
	dbUnavailable,
	asyncErrorFunction,
	s3: () => ({
		get: asyncErrorFunction,
	}),
};
