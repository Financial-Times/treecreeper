const { getType } = require('@financial-times/tc-schema-sdk');

const getSchemaSubset = (event, type, isCreate = false) => {
	console.log({ event, type, isCreate });
	const properties = event.query && event.query.properties;

	if (!properties) {
		return {
			schema: getType(type, {
				groupProperties: true,
				includeMetaFields: false,
				useMinimumViableRecord: isCreate,
			}),
			isSubset: false,
		};
	}

	const title = event.query && event.query.title;
	const fullSchema = getType(type, {
		groupProperties: false,
		includeMetaFields: false,
	});
	const propertyKeys = properties.split(',');
	console.log(fullSchema);
	return {
		schema: {
			...fullSchema,
			fieldsets: {
				[title]: {
					heading: title || 'Properties',
					properties: Object.entries(fullSchema.properties)
						.filter(([propName]) => propertyKeys.includes(propName))
						.reduce(
							(fieldset, [propName, propDef]) => ({
								...fieldset,
								[propName]: propDef,
							}),
							{},
						),
				},
			},
		},
		isSubset: true,
	};
};

module.exports = { getSchemaSubset };
