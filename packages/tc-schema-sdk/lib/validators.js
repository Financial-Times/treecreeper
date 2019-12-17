const propertyNameRegex = /^[a-z][a-zA-Z\d]+$/;
const { stripIndents } = require('common-tags');

// relationship value could be just a String(code), an Object or an Array of strings(codes) / objects(code and properties) / mixed
// this function is to normalise them into an Array of objects
const normaliseRelationshipProps = relValues => {
	if (relValues !== null) {
		if (typeof relValues === 'string') {
			return [{ code: relValues }];
		}
		if (Array.isArray(relValues)) {
			const normalisedRelValues = [];
			relValues.forEach(relValue =>
				typeof relValue === 'string'
					? normalisedRelValues.push({ code: relValue })
					: normalisedRelValues.push(relValue),
			);
			return normalisedRelValues;
		}
		// when value is an object
		return [relValues];
	}
};

const TreecreeperUserError = require('./biz-ops-error');

const validateTypeName = getType => type => getType(type);

const throwInvalidValueError = (
	typeName,
	propertyName,
	propertyValue,
	aliasPropertyName,
) => reason => {
	const propName = aliasPropertyName || propertyName;
	throw new TreecreeperUserError(
		stripIndents`Invalid value \`${propertyValue}\` for property \`${propName}\` on type \`${typeName}\`: ${reason}`,
	);
};

const validateProperty = ({
	getType,
	getEnums,
	getPrimitiveTypes,
	getRelationshipType,
}) => {
	const recursivelyCallableValidator = (
		typeName,
		propertyName,
		propertyValue,
		aliasPropertyName,
		relationshipPropsDef = undefined,
	) => {
		const propertyDefinition = relationshipPropsDef
			? relationshipPropsDef[propertyName]
			: getType(typeName).properties[propertyName];
		const primitiveTypesMap = getPrimitiveTypes();

		if (!propertyDefinition) {
			throw new TreecreeperUserError(
				`Invalid property \`${propertyName}\` on type \`${typeName}\`.`,
			);
		}

		if (propertyValue === null) {
			return;
		}

		const {
			validator,
			isRelationship,
			hasMany,
			cypher,
		} = propertyDefinition;

		const type =
			primitiveTypesMap[propertyDefinition.type] ||
			propertyDefinition.type;

		const exit = throwInvalidValueError(
			typeName,
			propertyName,
			propertyValue,
			aliasPropertyName,
		);

		if (isRelationship && !relationshipPropsDef) {
			if (cypher) {
				exit(
					`Cannot write relationship \`${propertyName}\` - it is defined using a custom, read-only query`,
				);
			}
			const relPropsList = normaliseRelationshipProps(propertyValue);
			if (!hasMany && relPropsList.length > 1) {
				exit(`Can only have one ${propertyName}`);
			}

			const {
				name: relType,
				properties: relPropsDef,
			} = getRelationshipType(typeName, propertyName);

			relPropsList.map(relProps => {
				Object.entries(relProps).forEach(
					([relPropName, relPropValue]) => {
						if (relPropName === 'code') {
							recursivelyCallableValidator(
								type,
								'code',
								relPropValue,
							);
						} else {
							recursivelyCallableValidator(
								relType,
								relPropName,
								relPropValue,
								false,
								relPropsDef,
							);
						}
					},
				);
			});
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
				const maxlength = validator
					.toString()
					.match(/\.\{\d+,(\d+)\}\$/);
				if (maxlength) {
					exit(
						`Must match pattern ${validator} and be no more than ${maxlength[1]} characters`,
					);
				}
				exit(`Must match pattern ${validator}`);
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
		throw new TreecreeperUserError(
			`Invalid property name \`${name}\`. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`,
		);
	}
};

module.exports = ({
	getEnums,
	getType,
	getPrimitiveTypes,
	getRelationshipType,
}) => {
	const propertyValidator = validateProperty({
		getEnums,
		getType,
		getPrimitiveTypes,
		getRelationshipType,
	});
	return {
		validateTypeName: validateTypeName(getType),
		validateProperty: propertyValidator,
		validatePropertyName,
		validateCode: (type, code, aliasName = 'code') =>
			propertyValidator(type, 'code', code, aliasName),
	};
};
