const metaProperties = [
	{
		name: '_createdByClient',
		type: 'Word',
		description: 'The client that was used to make the creation',
		label: 'Created by client',
	},
	{
		name: '_createdByUser',
		type: 'Word',
		description: 'The user that made the creation',
		label: 'Created by user',
	},
	{
		name: '_updatedByClient',
		type: 'Word',
		description: 'The client that was used to make the update',
		label: 'Updated by client',
	},
	{
		name: '_updatedByUser',
		type: 'Word',
		description: 'The last user to make an update',
		label: 'Updated by user',
	},
];

module.exports = metaProperties;
