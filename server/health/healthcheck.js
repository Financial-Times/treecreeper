const FIVE_MINUTES = 5 * 60 * 1000;

module.exports = async (check, func, type) => {
	let lastStatus = {};
	const checkAndUpdateState = async () => {
		lastStatus = await check();
		const outputObj = type ? func(type) : func();
		lastStatus = Object.assign(outputObj, lastStatus);
	};

	checkAndUpdateState();
	setInterval(checkAndUpdateState, FIVE_MINUTES).unref();
	return {
		getStatus: () => ({
			ok: lastStatus.lastCheckOk,
			checkOutput: lastStatus.lastCheckOutput,
			lastUpdated: lastStatus.lastCheckTime,
			id: lastStatus.id,
			name: lastStatus.name,
			businessImpact: lastStatus.businessImpact,
			severity: lastStatus.severity,
			technicalSummary: lastStatus.technicalSummary,
			panicGuide: lastStatus.panicGuide,
			_dependencies: lastStatus.dependencies,
		}),
	};
};
