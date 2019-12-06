const { selectAll } = require('unist-util-select');
const renderSubdocument = require('../render-subdocument');
const resolvePropertyName = require('../resolve-property-name');
const flattenNodeToPlainString = require('../flatten-node-to-plain-string');

const checkDateIsValid = date => !Number.isNaN(Number(date));
/*
  This is naïve and can return surprising results. If there are any listItems
  inside a document of a type that is marked as hasMany, you'll get only those
  listItems and not the rest of the document. If there are no listItems, it will
  return the whole document.

  This won't be a problem yet, because the fields that are hasMany are so far
  only other Types. And currently the only planned change to that is that there
  will some time be fields that can be lists of strings, not of lists of
  documents.

  However, if those things ever change this will need updated.
*/
function split(subdocument) {
	const items = selectAll('listItem', subdocument);
	if (items.length) {
		return items;
	}

	return [];
}

const parsePropertyDefinition = (propDefString, typeProperties) => {
	const properties = {};
	let buffer = '';
	let propName = '';
	const size = propDefString.length;
	for (let i = 0; i < size; i++) {
		const char = propDefString[i];
		let isSkip = false;
		switch (char) {
			case '\t':
				isSkip = buffer === '';
				break;
			case ':':
				if (buffer !== '') {
					const resolved = resolvePropertyName({
						heading: buffer.trim(),
						properties: typeProperties,
					});
					if (!resolved) {
						throw new Error(`could not find ${buffer.trim()}`);
					}
					[propName] = resolved;
					buffer = '';
					isSkip = true;
				}
				break;
			case '\n':
				properties[propName] = buffer.trim();
				buffer = '';
				isSkip = true;
				break;
			default:
				break;
		}
		if (!isSkip) {
			buffer += char;
		}
	}
	if (buffer !== '' && propName) {
		properties[propName] = buffer.trim();
	}
	return properties;
};

const parseMultilineDefinition = ({ children = [] }, typeProperties) => {
	const properties = {};

	const content = children.reduce((flattenedContent, node) => {
		const hasTextValue = typeof node.value === 'string';
		const hasChildren = Array.isArray(node.children);

		const regex = /(.+?):?\n(.+)$/s;
		if (hasTextValue) {
			const [, code, propDef] = node.value.match(regex) || [];
			if (code) {
				if (propDef) {
					Object.assign(
						properties,
						parsePropertyDefinition(propDef, typeProperties),
					);
				}
				return flattenedContent + code;
			}
			return flattenedContent + node.value;
		}

		if (hasChildren) {
			const {
				value: childValue,
				properties: childProperties,
			} = parseMultilineDefinition(node, typeProperties);
			Object.assign(properties, childProperties);
			return flattenedContent + childValue;
		}

		return flattenedContent;
	}, '');

	return {
		value: content,
		properties,
	};
};

/*
  These coercers take a subdocument that should be coerced to their eponymous
  type, and they return an object with a key of `valid` and a key of `value`. if
  `valid` is `true` then `value` will be the coerced property. if `valid` is
  `false` then `value` will be the problem message
*/
module.exports = {
	/*
	  Huge assumption being made here that the only thing that will ever care
	  about `hasMany` is `String` and `Subdocument` types, which in our case
	  includes Codes.
	*/
	String(subdocument, { hasMany = false, properties = {} } = {}) {
		const items = split(subdocument);

		// now we accept multiline definition as property

		// Expecting a list, got a list
		if (hasMany && items.length) {
			return {
				valid: true,
				value: items
					.map(item => parseMultilineDefinition(item, properties))
					.map(item =>
						Object.keys(item.properties).length
							? { [item.value]: item.properties }
							: item.value,
					),
			};
		}

		// Expecting a list, didn't get a list'
		if (hasMany && !items.length) {
			return {
				valid: false,
				value: "expected a list, but didn't get any bulleted items",
			};
		}

		// Not expecting a list, didn't get a list'
		if (!hasMany && !items.length) {
			const item = parseMultilineDefinition(subdocument, properties);
			return {
				valid: true,
				value: Object.keys(item.properties).length
					? { [item.value]: item.properties }
					: item.value,
			};
		}

		// Not expecting a list, but got a list
		if (!hasMany && items.length) {
			return {
				valid: false,
				value: 'expected a single item, but got a bulleted list',
			};
		}
	},
	/*
	  Subdocument is not a real biz-ops type. This is to separate strings (i.e.,
	  urls and words) from Documents (i.e. paragraphs, sentences and documents)
	*/
	Subdocument(subdocument, { hasMany = false } = {}) {
		if (hasMany) {
			return {
				valid: true,
				value: split(subdocument).map(renderSubdocument),
			};
		}
		return {
			valid: true,
			value: renderSubdocument(subdocument),
		};
	},
	Date(subdocument) {
		const flattenedContent = flattenNodeToPlainString(subdocument);
		const date = new Date(flattenedContent);
		const dateIsValid = checkDateIsValid(date);

		if (dateIsValid) {
			return {
				valid: true,
				value: date.toISOString(),
			};
		}

		return {
			valid: false,
			value: `i couldn't resolve ${flattenedContent} to a Date`,
		};
	},
	Boolean(subdocument) {
		const flattenedContent = flattenNodeToPlainString(
			subdocument,
		).toLowerCase();

		switch (flattenedContent) {
			case 'true':
			case 'yes':
			case '👍': {
				return {
					valid: true,
					value: true,
				};
			}
			case 'false':
			case 'no':
			case '👎': {
				return {
					valid: true,
					value: false,
				};
			}
			default: {
				return {
					valid: false,
					value: `i couldn't resolve ${flattenedContent} to a boolean`,
				};
			}
		}
	},
};

module.exports.DateTime = module.exports.Date;
module.exports.Timestamp = module.exports.Date;
