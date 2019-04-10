const propertyNameRegex = /^[a-z][a-zA-Z\d]+$/;
const primitiveTypesMap = require('./primitive-types-map');

const toArray = value => (Array.isArray(value) ? value : [value]);

const BizOpsError = require('./biz-ops-error');

const validateTypeName = getType => type => getType(type);

const throwInvalidValueError = (
	typeName,
	propertyName,
	propertyValue,
) => reason => {
	throw new BizOpsError(
		`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
				${reason}`,
	);
};

const validateProperty = ({ getType, getEnums }) => {
	const recursivelyCallableValidator = (
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

		const { validator, isRelationship } = propertyDefinition;

		const type =
			primitiveTypesMap[propertyDefinition.type] ||
			propertyDefinition.type;

		const exit = throwInvalidValueError(
			typeName,
			propertyName,
			propertyValue,
		);
		if (isRelationship) {
			toArray(propertyValue).map(value =>
				recursivelyCallableValidator(type, 'code', value),
			);
		} else if (type === 'Boolean') {
			if (typeof propertyValue !== 'boolean') {
				exit('Must be a Boolean');
			}
		} else if (type === 'Float') {
			if (!Number.isFinite(propertyValue)) {
				exit('Must be a finite floating point number');
			}
		} else if (type === 'Int') {
			if (
				!Number.isFinite(propertyValue) ||
				Math.round(propertyValue) !== propertyValue
			) {
				exit('Must be a finite integer');
			}
		} else if (type === 'String') {
			if (typeof propertyValue !== 'string') {
				exit('Must be a string');
			}

			if (validator && !validator.test(propertyValue)) {
				exit(
					`Must match pattern ${validator} and be no more than 64 characters`,
				);
			}
		} else if (type in getEnums()) {
			const validVals = Object.values(getEnums()[type]);
			if (!validVals.includes(propertyValue)) {
				exit(`Must be a valid enum: ${validVals.join(', ')}`);
			}
		}
	};

	return recursivelyCallableValidator;
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
