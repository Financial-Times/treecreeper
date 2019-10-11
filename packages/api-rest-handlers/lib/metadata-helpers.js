const { stripIndents } = require('common-tags');

const metaPropertiesForUpdate = recordName => stripIndents`
	${recordName}._updatedByRequest = $requestId,
	${recordName}._updatedByClient = $clientId,
	${recordName}._updatedByUser = $clientUserId,
	${recordName}._updatedTimestamp = datetime($timestamp)
`;
// ,
// 	${recordName}._lockedFields = $lockedFields
// `;

const metaPropertiesForCreate = recordName => stripIndents`
	${recordName}._createdByRequest = $requestId,
	${recordName}._createdByClient = $clientId,
	${recordName}._createdByUser = $clientUserId,
	${recordName}._createdTimestamp = datetime($timestamp),
	${metaPropertiesForUpdate(recordName)}
`;
// ${recordName}._lockedFields = $lockedFields,

const prepareMetadataForNeo4jQuery = metadata => ({
	timestamp: new Date().toISOString(),
	requestId: metadata.requestId || null,
	clientId: metadata.clientId || null,
	clientUserId: metadata.clientUserId || null,
});

module.exports = {
	prepareMetadataForNeo4jQuery,
	metaPropertiesForUpdate,
	metaPropertiesForCreate,
};
