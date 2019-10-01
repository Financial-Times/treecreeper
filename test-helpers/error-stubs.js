const { driver } = require('../packages/api-core/lib/db-connection');

const asyncErrorFunction = async () => {
	throw new Error('oh no');
};

const dbUnavailable = () =>
	jest.spyOn(driver, 'session').mockReturnValue({
		run: asyncErrorFunction,
		close: () => {},
	});

module.exports = {
	dbUnavailable,
	asyncErrorFunction,
	s3: () => ({
		get: asyncErrorFunction,
	}),
};
