const setHeaders = (requestParams, context, ee, next) => {
	requestParams.headers = {
		'Content-Type': 'application/json',
		api_key: process.env.LOAD_TEST_API_KEY,
		'client-id': 'load-testing-client-id'
	};
	return next();
};

const setCSVToJSONBody = (requestParams, context, ee, next) => {
	if (context.vars.primaryNode === 'System') {
		requestParams.body = JSON.stringify({
			node: {
				serviceTier: context.vars.serviceTier,
				lifecycleStage: context.vars.lifecycleStage
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
	} else if (context.vars.primaryNode === 'Team') {
		requestParams.body = JSON.stringify({
			node: {
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
	} else {
		requestParams.body = JSON.stringify({
			node: {
				code: context.vars.code
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
	}

	return next();
};

module.exports = {
	setHeaders,
	setCSVToJSONBody
};
