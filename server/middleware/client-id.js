const { writeRestriction, readRestriction } = require('./helpers');

const setClientIdFromHeadersToLocals = (req, res, next) => {
	res.locals.clientId = req.get('client-id');
	next();
};

const disableWrites = (req, res, next) => {
	if (req.method !== 'GET' && writeRestriction(res)) {
		return res.status(405).send({
			message:
				"Before migration from cmdb is complete, writes to biz-ops-api are restricted to avoid data inconsistencies. Please speak to #reliability-eng to discuss what you need to do - we're here to help"
		});
	}
	next();
};

const disableReads = (req, res, next) => {
	if (
		req.method === 'GET' &&
		process.env.DISABLE_READS === true &&
		readRestriction(res)
	) {
		return res.status(500).send({
			message:
				"Biz-ops-api is undergoing vital maintenance. Therefore, reads to the biz-ops-api are restricted at this time to avoid retrieving incomplete data. Please speak to #reliability-eng to discuss what you need to do - we're here to help "
		});
	}
	next();
};

module.exports = {
	setClientIdFromHeadersToLocals,
	disableWrites,
	disableReads
};
