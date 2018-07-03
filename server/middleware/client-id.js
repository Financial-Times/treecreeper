const hasClientId = (req, res, next) => {
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
		!/^(cmdb-to-bizop|DROP ALL|(read)-client-id|(read)-relationship-client)$/.test(
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
	hasClientId,
	disableWrites,
	disableReads
};
