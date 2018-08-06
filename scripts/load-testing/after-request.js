const { driver } = require('../../server/db-connection');
const logger = require('@financial-times/n-logger').default;

const cleanUp = async () => {
	const session = driver.session();
	const cleanDBQuery = `MATCH (n { _createdByClient: "load-testing-client-id" }) DETACH DELETE n`;
	try {
		return await session.run(cleanDBQuery);
	} catch (err) {
		logger.warn({
			event: 'LOAD_TESTING_CLEAN_UP',
			err: err.message,
			cleanDBQuery
		});
	} finally {
		session.close(() => {
			driver.close();
		});
	}
};

cleanUp();
module.exports = cleanUp;
