class SyntaxError extends Error {}

/*
 This function divides from mutipile definition to code and property string e.g,

 The definition:
 - child-code
   propNameOne: propValueOne

 Divides to:
 {
   code: 'child-code',
   propDef: '  propNameOne: propValueOne\n',
 }
*/
const dividePropertyDefinition = subdocument => {
	const linefeedIndex = subdocument.indexOf('\n');
	if (linefeedIndex > -1) {
		return {
			code: subdocument.slice(0, linefeedIndex),
			propDef: subdocument.slice(linefeedIndex + 1),
		};
	}

	return {
		code: subdocument,
		propDef: '',
	};
};

// Token characters of meaningful property descriptor
const TAB = '\t';
const PROPERTY_NAME_SEPARATOR = ':';
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';

/*
 This is tiny lexer/parser function for analyze multiple property definition.
 See above constant characters and parse into an object with following format e.g,

 Definition
   propNameOne: propValueOne
   propNameTwo: propValueTwo
 Will be parsed as
   {
     propNameOne: 'propValueOne',
     propNameTwo: 'propValueTwo',
   }
*/
const parsePropertyDefinition = (propDefString, line) => {
	const properties = {};
	const strlen = propDefString.length;
	let buffer = '';
	let propName = '';
	let column = 0;

	for (let i = 0; i < strlen; i++) {
		const char = propDefString[i];
		let isSkip = false;

		switch (char) {
			// just identing
			case TAB:
				// when buffer is empty, it means 'parsing property name', so ignore the tab
				isSkip = buffer === '';
				break;

			// property name declaration ends
			case PROPERTY_NAME_SEPARATOR:
				if (buffer === '') {
					throw new SyntaxError(
						`unexpected property name separator ':' found at line ${line}, column ${column} `,
					);
				} else if (!/^[a-z][a-zA-Z0-9]+$/.test(buffer.trim())) {
					throw new SyntaxError(
						`nested property name ${buffer.trim()} should be lower camel case at line ${line}, column ${column}`,
					);
				}
				propName = buffer.trim();
				buffer = '';
				isSkip = true;
				break;

			// property value declaration ends
			case LINE_FEED:
				if (propName === '') {
					throw new SyntaxError(
						`unexpected linefeed token found at line ${line}, column ${column}`,
					);
				} else if (buffer.trim() === '') {
					throw new SyntaxError(
						`property value for ${propName} must not be empty at line ${line}, column ${column}`,
					);
				}
				properties[propName] = buffer.trim();
				// reset state and update line and column
				buffer = '';
				propName = '';
				isSkip = true;
				line++;
				column = 0;
				break;

			// (Maybe don't need, but for Windows...) ignore carriage return character
			case CARRIAGE_RETURN:
				isSkip = true;
				break;

			default:
				break;
		}
		if (!isSkip) {
			buffer += char;
		}
		column++;
	}

	// deal with remain buffers
	if (buffer !== '') {
		if (propName === '') {
			throw new SyntaxError(
				`Unexpected character remaining at line ${line}`,
			);
		} else if (buffer.trim() === '') {
			throw new SyntaxError(
				`property value for ${propName} must not be empty at line ${line}, column ${column}`,
			);
		}
		properties[propName] = buffer.trim();
	}

	return properties;
};

const checkNodeHasStringValue = node => {
	return typeof node.value === 'string';
};

const checkNodeHasChildren = node => {
	return Array.isArray(node.children);
};

const parseMultilineDefinition = ({ children = [] }) => {
	return children.reduce((definitions, node) => {
		const hasTextValue = checkNodeHasStringValue(node);
		const hasChildren = checkNodeHasChildren(node);

		if (hasTextValue) {
			const {
				value,
				position: {
					start: { line },
				},
			} = node;
			const { code, propDef } = dividePropertyDefinition(value);
			definitions.code = code;
			if (propDef !== '') {
				definitions = {
					...definitions,
					// add 1 because property definition is the next line of code
					...parsePropertyDefinition(propDef, line + 1),
				};
			}
		}

		if (hasChildren) {
			definitions = {
				...definitions,
				...parseMultilineDefinition(node),
			};
		}
		return definitions;
	}, {});
};

module.exports = parseMultilineDefinition;
