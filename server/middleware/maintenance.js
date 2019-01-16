const disableWrites = (req, res, next) => {
	if (process.env.DISABLE_WRITES === 'true' && req.method !== 'GET') {
		return res.status(503).json({
			errors: [
				{
					message: `\
Biz-Ops API is undergoing vital maintenance. Therefore, writes to the biz-ops-api \
are restricted at this time to avoid data inconsistencies. Please slack #biz-ops to discuss \
what you need to do - we're here to help`,
				},
			],
		});
	}
	next();
};

const disableReads = (req, res, next) => {
	if (
		process.env.DISABLE_READS === 'true' &&
		(req.method === 'GET' || /^\/graphql/.test(req.originalUrl))
	) {
		return res.status(503).json({
			errors: [
				{
					message: `\
Biz-Ops API is undergoing vital maintenance. Therefore, reads from the biz-ops-api \
are restricted at this time to avoid retrieving incomplete data. Please slack \
#biz-ops to discuss what you need to do - we're here to help`,
				},
			],
		});
	}
	next();
};

module.exports = {
	disableWrites,
	disableReads,
};
