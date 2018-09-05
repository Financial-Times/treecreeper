const writeRestriction = req =>
	!/^(cmdb-to-bizop|biz-ops-admin|DROP ALL|(delete|update|create|test|biz-ops-load-test)-client-id|(create|delete|update)-relationship-client)$/.test(
		req.get('client-id')
	);

const readRestriction = req =>
	!req.get('client-id') ||
	!/^(cmdb-to-bizop|DROP ALL|(read|test|biz-ops-load-test)-client-id|(read|test|biz-ops-load-test)-relationship-client)$/.test(
		req.get('client-id')
	);

const disableWrites = (req, res, next) => {
	if (req.method !== 'GET' && writeRestriction(req)) {
		return res.status(505).json({
			errors: [
				{
					message: `
					Before migration from cmdb is complete, writes to biz-ops-api are restricted
					to avoid data inconsistencies. Please speak to #reliability-eng to discuss
					what you need to do - we're here to help`
				}
			]
		});
	}
	next();
};

const disableReads = (req, res, next) => {
	if (
		(req.method === 'GET' ||
			(req.method === 'POST' && /^\/graphql/.test(req.originalUrl))) &&
		process.env.DISABLE_READS === 'true' &&
		readRestriction(req)
	) {
		return res.status(503).json({
			errors: [
				{
					message: `
					Biz-ops-api is undergoing vital maintenance. Therefore, reads to the biz-ops-api
					are restricted at this time to avoid retrieving incomplete data. Please speak to
					#reliability-eng to discuss what you need to do - we're here to help`
				}
			]
		});
	}
	next();
};

module.exports = {
	disableWrites,
	disableReads
};
