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
		name: '_createdTimestamp',
		type: 'DateTime',
		label: 'Created at',
		description: 'The time and date this record was created',
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
	{
		name: '_updatedTimestamp',
		type: 'DateTime',
		label: 'Updated at',
		description: 'The time and date this record was last updated',
	},
	{
		name: '_lockedFields',
		type: 'String',
		label: 'Locked fields',
		description:
			'Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.',
	},
];

module.exports = metaProperties;
