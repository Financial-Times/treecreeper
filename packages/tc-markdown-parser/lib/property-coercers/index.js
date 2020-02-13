const { selectAll } = require('unist-util-select');
const renderSubdocument = require('../render-subdocument');
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
	String(subdocument) {
		const items = split(subdocument);

		// Not expecting a list, but got a list
		if (items.length) {
			return {
				valid: false,
				value: 'expected a single item, but got a bulleted list',
			};
		}

		return {
			valid: true,
			value: flattenNodeToPlainString(subdocument),
		};
	},
	/*
	 NestedString is similar to String coercer, but it only has parsed propery values e.g,

	 # favourite child

	 - code
	   propNameOne: propValueOne
	                ------------
	                passed this part to subdocument
	*/
	NestedString(subdocument = {}) {
		if (subdocument.children) {
			return {
				valid: true,
				value: flattenNodeToPlainString(subdocument),
			};
		}
		return {
			valid: false,
			value: 'nested string should not be empty',
		};
	},
	/*
	  Subdocument is not a real biz-ops type. This is to separate strings (i.e.,
	  urls and words) from Documents (i.e. paragraphs, sentences and documents)
	*/
	Subdocument(subdocument, { hasMany = false } = {}) {
		if (hasMany) {
			return {
				valid: true,
				// avod passing index as second parameter
				value: split(subdocument).map(subdoc =>
					renderSubdocument(subdoc),
				),
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
	Int(subdocument) {
		const flattenedContent = flattenNodeToPlainString(subdocument);
		// If the value contains exponential character, we should use parseFloat instead
		// ref: https://tc39.es/ecma262/#sec-parseint-string-radix
		const value = /^[\de]+$/.test(flattenedContent)
			? parseFloat(flattenedContent)
			: parseInt(flattenedContent, 10);

		if (Number.isNaN(value)) {
			return {
				valid: false,
				value: `i couldnt' resolve ${flattenedContent} to an integer`,
			};
		}
		return {
			valid: true,
			value,
		};
	},
	Float(subdocument) {
		const flattenedContent = flattenNodeToPlainString(subdocument);
		const value = parseFloat(flattenedContent);

		if (Number.isNaN(value)) {
			return {
				valid: false,
				value: `i couldnt' resolve ${flattenedContent} to a float`,
			};
		}
		return {
			valid: true,
			value,
		};
	},
};

module.exports.DateTime = module.exports.Date;
module.exports.Timestamp = module.exports.Date;
