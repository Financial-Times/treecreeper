const { driver } = require('../../server/data/db-connection');
const logger = require('@financial-times/n-logger').default;

const cleanUp = async () => {
	const session = driver.session();
	const cleanDBQuery = `MATCH (n { _createdByClient: "biz-ops-load-test" }) DETACH DELETE n`;
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
