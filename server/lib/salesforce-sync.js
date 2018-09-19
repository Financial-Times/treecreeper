const jsforce = require('jsforce');
const { executeQuery } = require('./db-connection');
const { logger } = require('./request-context');

const login = () => {
	return new Promise((res, rej) => {
		const conn = new jsforce.Connection();
		conn.login(
			process.env.SALESFORCE_USER,
			`${process.env.SALESFORCE_PASSWORD}${process.env.SALESFORCE_TOKEN}`,
			function(err) {
				if (err) {
					rej(err);
				}
				res(conn);
			}
		);
	});
};

module.exports.setSalesforceIdForSystem = async ({
	node: { code, name, SF_ID }
}) => {
	if (!process.env.SALESFORCE_USER) {
		logger.info(
			'Skipping salesforce system creation - no salesforce user defined'
		);
		return;
	}

	if (SF_ID) {
		logger.info(
			'Skipping salesforce system creation - system already exists in salesforce'
		);
		return;
	}
	try {
		const salesforceName = (name || code).substr(0, 80);
		const conn = await login();
		const { id: SF_ID } = await new Promise((res, rej) => {
			conn.sobject('BMCServiceDesk__BMC_BaseElement__c').create(
				{
					Name: salesforceName,
					BMCServiceDesk__Name__c: salesforceName,
					BMCServiceDesk__TokenId__c: salesforceName,
					System_Code__c: code.substr(0, 48),
					RecordTypeId: '012D0000000Qn40IAC', // this is the id for the 'System' type
					BMCServiceDesk__Description__c: `See https://dewey.in.ft.com/view/system/${code}`
				},
				(err, result) => {
					if (err) {
						return rej(err);
					}
					res(result);
				}
			);
		});
		logger.info(
			{ event: 'SALESFORCE_SYSTEM_CREATION_SUCCESS', code, SF_ID },
			'Create system in salesforce'
		);
		await executeQuery(
			'MATCH (s:System {code: $code}) SET s.SF_ID = $SF_ID RETURN s',
			{ code, SF_ID }
		);
		logger.info(
			{ event: 'SALESFORCE_SYSTEM_ID_SAVED', code, SF_ID },
			'Saved salesforce system id to biz-ops'
		);
	} catch (error) {
		logger.error(
			{ error, event: 'SALESFORCE_SYSTEM_CREATION_FAILURE', code },
			'Failed to create system in salesforce'
		);
	}
};
