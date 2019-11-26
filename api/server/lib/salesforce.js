const jsforce = require('jsforce');
const { logger, getContext } = require('../../../packages/tc-api-express-logger');

const login = () => {
	const conn = new jsforce.Connection();
	return conn
		.login(
			process.env.SALESFORCE_USER,
			`${process.env.SALESFORCE_PASSWORD}${process.env.SALESFORCE_TOKEN}`,
		)
		.then(() => conn);
};


module.exports.setSalesforceIdForSystem = async (
	{ code, name, action },
	patch
) => {
	if (!process.env.SALESFORCE_USER) {
		logger.info(
			'Skipping salesforce system creation - no salesforce user defined',
		);
		return;
	}
	if (action !== 'CREATE') {
		return;
	}
	try {
		const salesforceName = (name || code).slice(0, 80);
		const conn = await login();
		const { id: newSalesforceId } = await conn
			.sobject('BMCServiceDesk__BMC_BaseElement__c')
			.create({
				Name: salesforceName,
				BMCServiceDesk__Name__c: salesforceName,
				BMCServiceDesk__TokenId__c: salesforceName,
				System_Code__c: code.slice(0, 48),
				RecordTypeId: '012D0000000Qn40IAC', // this is the id for the 'System' type
				BMCServiceDesk__Description__c: `See https://dewey.in.ft.com/view/system/${code}`,
			});
		logger.info(
			{
				event: 'SALESFORCE_SYSTEM_CREATION_SUCCESS',
				code,
				SF_ID: newSalesforceId,
			},
			'Create system in salesforce',
		);
		const {requestId} = getContext()
		await patch({
			type: 'System',
			code,
			metadata: {clientId: 'biz-ops-api', requestId},
			query: {
				lockFields: 'SF_ID',
			},
			body: { SF_ID: newSalesforceId },
		});
		logger.info(
			{
				event: 'SALESFORCE_SYSTEM_ID_SAVED',
				code,
				SF_ID: newSalesforceId,
			},
			'Saved salesforce system id to biz-ops',
		);
	} catch (error) {
		logger.error(
			{ error, event: 'SALESFORCE_SYSTEM_CREATION_FAILURE', code },
			'Failed to create system in salesforce',
		);
	}
};
