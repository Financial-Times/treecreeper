const FIVE_MINUTES = 5 * 60 * 1000;

const outputs = require('./outputs');

module.exports = async (check, outputName, outputOptions) => {
	let lastStatus = {};
	const checkAndUpdateState = async () => {
		lastStatus = await check();

		const standardOutput = outputs[outputName];
		lastStatus = Object.assign(
			typeof standardOutput === 'function'
				? standardOutput(outputOptions)
				: standardOutput,
			lastStatus,
		);
	};

	checkAndUpdateState();
	setInterval(checkAndUpdateState, FIVE_MINUTES).unref();
	return {
		getStatus: () => lastStatus,
	};
};
