const propertyNameRegex = /^[a-z][a-zA-Z\d]+$/;
const primitiveTypesMap = require('./primitive-types-map');

const toArray = value => (Array.isArray(value) ? value : [value]);

class BizOpsError {
	constructor(message) {
		this.message = message;
	}
}

const validateTypeName = getType => type => {
	if (!getType(type)) {
		throw new BizOpsError(`Invalid node type \`${type}\``);
	}
};

const validateProperty = ({ getType, getEnums }) => (
	typeName,
	propertyName,
	propertyValue,
) => {
	const propertyDefinition = getType(typeName).properties[propertyName];

	if (!propertyDefinition) {
		throw new BizOpsError(
			`Invalid property \`${propertyName}\` on type \`${typeName}\`.`,
		);
	}

	if (propertyValue === null) {
		return;
	}

	const { validator, relationship } = propertyDefinition;
	const type =
		primitiveTypesMap[propertyDefinition.type] || propertyDefinition.type;

	if (type === 'Boolean') {
		if (typeof propertyValue !== 'boolean') {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a Boolean`,
			);
		}
	} else if (type === 'Float') {
		if (!Number.isFinite(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a finite floating point number`,
			);
		}
	} else if (type === 'Int') {
		if (
			!Number.isFinite(propertyValue) ||
			Math.round(propertyValue) !== propertyValue
		) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a finite integer`,
			);
		}
	} else if (type === 'String') {
		if (typeof propertyValue !== 'string') {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a string`,
			);
		}
		if (validator && !validator.test(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must match pattern ${validator} and be no more than 64 characters`,
			);
		}
	} else if (type in getEnums()) {
		const validVals = Object.values(getEnums()[type]);
		if (!validVals.includes(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a valid enum: ${validVals.join(', ')}`,
			);
		}
		// validate related codes
	} else if (relationship) {
		toArray(propertyValue).map(value =>
			validateProperty(type, 'code', value),
		);
	}
};

const validatePropertyName = name => {
	// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
	// salesforce sync works during the transition to the new architecture
	if (name !== 'SF_ID' && !propertyNameRegex.test(name)) {
		throw new BizOpsError(
			`Invalid property name \`${name}\`. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`,
		);
	}
};

module.exports = ({ getEnums, getType }) => {
	const propertyValidator = validateProperty({ getEnums, getType });
	return {
		validateTypeName: validateTypeName(getType),
		validateProperty: propertyValidator,
		validatePropertyName,
		validateCode: (type, code) => propertyValidator(type, 'code', code),
		BizOpsError,
	};
};
