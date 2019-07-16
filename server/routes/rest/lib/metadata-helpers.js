const { stripIndents } = require('common-tags');
const { getContext } = require('../../../lib/request-context');

const getDbWriteContext = () => {
	// TODO need to add timestamp when request starts ad expose here too
	// Default to null rather than undefined because it avoids a 'missing
	// parameter' error and it unsets any previous values when updating.
	const { requestId, clientId = null, clientUserId = null } = getContext();

	return {
		requestId,
		clientId,
		clientUserId,
		timestamp: new Date().toISOString(),
	};
};

const metaPropertiesForUpdate = recordName => stripIndents`
	${recordName}._updatedByRequest = $requestId,
	${recordName}._updatedByClient = $clientId,
	${recordName}._updatedByUser = $clientUserId,
	${recordName}._updatedTimestamp = datetime($timestamp),
	${recordName}._lockedFields = $lockedFields
`;

const metaPropertiesForCreate = recordName => stripIndents`
	${recordName}._createdByRequest = $requestId,
	${recordName}._createdByClient = $clientId,
	${recordName}._createdByUser = $clientUserId,
	${recordName}._createdTimestamp = datetime($timestamp),
	${recordName}._lockedFields = $lockedFields,
	${metaPropertiesForUpdate(recordName)}
`;

module.exports = {
	getDbWriteContext,
	metaPropertiesForUpdate,
	metaPropertiesForCreate,
};
