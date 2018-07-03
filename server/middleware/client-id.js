const getClientId = (req, res, next) => {
	res.locals.clientId = req.get('client-id');
	next();
};

const disableWrites = (req, res, next) => {
	if (
		req.method !== 'GET' &&
		!/^(cmdb-to-bizop|DROP ALL|(delete|update|create|test)-client-id|(create|delete|update)-relationship-client)$/.test(
			res.locals.clientId
		)
	) {
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
		process.env.DATA_REPOPULATION === true &&
		!/^(cmdb-to-bizop|DROP ALL|(read|test)-client-id|(read|test)-relationship-client)$/.test(
			res.locals.clientId
		)
	) {
		return res.status(500).send({
			message:
				"Before migration from cmdb is complete, reads to biz-ops-api are restricted to avoid incomplete data. Please speak to #reliability-eng to discuss what you need to do - we're here to help "
		});
	}
	next();
};

module.exports = {
	getClientId,
	disableWrites,
	disableReads
};
