const querystring = require('querystring');

const { getType } = require('@financial-times/tc-schema-sdk');

/* meta fields should not be included in the forms (view) as they fail the
propertyName validation due to the underscore. They must be set to false
otherwise it will default to true.
*/
const getSchemaSubset = (
	event,
	type,
	includeMetaFields = true,
	isCreate = false,
) => {
	const properties = event.query && event.query.properties;

	if (!properties) {
		return getType(type, {
			groupProperties: true,
			includeMetaFields,
			useMinimumViableRecord: isCreate,
		});
	}

	const title = event.query && event.query.title;
	const fullSchema = getType(type);
	const propertyKeys = properties.split(',');

	return {
		type: fullSchema.name,
		name: fullSchema.name,
		description: fullSchema.description,
		fieldsets: {
			[title]: {
				heading: title || 'Properties',
				properties: Object.keys(fullSchema.properties)
					.filter(key => propertyKeys.includes(key))
					.reduce(
						(obj, key) =>
							Object.assign(obj, {
								[key]: fullSchema.properties[key],
							}),
						{},
					),
			},
		},
		pluralName: fullSchema.pluralName,
		referralQs: querystring.stringify(event.query),
	};
};

module.exports = getSchemaSubset;
