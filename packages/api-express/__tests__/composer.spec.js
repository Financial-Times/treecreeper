const Composer = require('../lib/composer');
const { createLogger } = require('../../api-express-logger');

describe('Composer', () => {
	const createComposeFunction = data => options => ({
		...options,
		[data]: { logger: options.logger },
	});

	it('compose multiple packages as object', () => {
		const logger = createLogger();
		const composed = new Composer(
			{ logger },
			createComposeFunction('first'),
			createComposeFunction('second'),
			createComposeFunction('third'),
			createComposeFunction('fourth'),
		).toObject();

		expect(composed).toMatchObject({
			logger,
			first: { logger },
			second: { logger },
			third: { logger },
			fourth: { logger },
		});
	});
});
