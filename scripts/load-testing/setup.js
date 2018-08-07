const setHeaders = (requestParams, context, ee, next) => {
	requestParams.headers = {
		'Content-Type': 'application/json',
		api_key: process.env.LOAD_TEST_API_KEY,
		'client-id': 'biz-ops-load-test'
	};
	return next();
};

const setCSVToJSONBody = (requestParams, context, ee, next) => {
	requestParams.body = JSON.stringify({
		node: {
			serviceTier: context.vars.serviceTier,
			lifecycleStage: context.vars.lifecycleStage,
			contactType: context.vars.contactType,
			email: context.vars.email,
			slack: context.vars.slack
		},
		relationships: {
			[context.vars.relationshipName]: [
				{
					direction: context.vars.direction,
					nodeType: context.vars.nodeType,
					nodeCode: context.vars.nodeCode
				}
			]
		}
	});
	return next();
};

module.exports = {
	setHeaders,
	setCSVToJSONBody
};
