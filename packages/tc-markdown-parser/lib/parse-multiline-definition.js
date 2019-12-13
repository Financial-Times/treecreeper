const builder = require('unist-builder');

class SyntaxError extends Error {
	constructor(message, line, column) {
		super(message);
		this.position = {
			start: {
				line,
				column,
			},
		};
	}
}

const trim = parsedBuffer => parsedBuffer.replace(/^[\t\s]+|[\t\s]+$/g, '');

const parseMultilineValue = valueDefinitionString => {
	const listItems = [];
	let buffer = '';
	let isListStared = false;

	for (const char of valueDefinitionString) {
		let isSkip = false;
		switch (char) {
			case '\t':
			case ' ':
				if (buffer === '') {
					isSkip = true;
				}
				break;
			case '-':
			case '*':
				if (buffer === '') {
					isSkip = true;
					isListStared = true;
				}
				break;
			case '\n':
				listItems.push(trim(buffer));
				buffer = '';
				isSkip = true;
				isListStared = false;
				break;
			default:
				if (!isListStared) {
					throw new SyntaxError("list must starts with '-' or '*'");
				}
				break;
		}
		if (!isSkip) {
			buffer += char;
		}
	}
	if (buffer !== '') {
		listItems.push(trim(buffer));
	}
	return listItems;
};

const createNode = (key, value, line, column) => {
	// If value definition does not have any line feed character,
	// we should deal with single value, not an array
	if (value.indexOf('\n') > -1) {
		value = parseMultilineValue(value);
	}

	return builder('property', {
		key,
		position: {
			start: {
				line,
				column,
			},
		},
		children: [
			builder('text', {
				value,
			}),
		],
	});
};

/*
 This function divides from multiple definition to code and property string e.g,

 The definition:
 - child-code
   propNameOne: propValueOne

 Divides to:
 {
   code: 'child-code',
   propDefs: '  propNameOne: propValueOne\n',
 }
*/
const dividePropertyDefinition = subdocument => {
	const linefeedIndex = subdocument.indexOf('\n');
	if (linefeedIndex > -1) {
		return {
			code: subdocument.slice(0, linefeedIndex),
			propDefs: subdocument.slice(linefeedIndex + 1),
		};
	}

	return {
		code: subdocument,
		propDefs: '',
	};
};

// Token characters of meaningful property descriptor
const TAB = '\t';
const PROPERTY_NAME_SEPARATOR = ':';
const WHITE_SPACE = ' ';
const LINE_FEED = '\n';
const CARRIAGE_RETURN = '\r';

const readValue = (index, defString, line, column) => {
	let buffer = '';
	let point;
	let i = index;

	const singleLineIndex = defString.indexOf('\n', index);
	if (singleLineIndex === -1) {
		return {
			offset: defString.length - index,
			value: trim(defString.slice(index)),
			line,
			column,
		};
	}
	if (trim(defString.slice(index, singleLineIndex)) !== '') {
		return {
			offset: singleLineIndex - index + 1,
			value: trim(defString.slice(index, singleLineIndex)),
			line: line + 1,
			column: column + singleLineIndex,
		};
	}

	for (; i < defString.length; i++) {
		const char = defString[i];
		switch (char) {
			case LINE_FEED:
				line++;
				column = 0;
				break;
			case PROPERTY_NAME_SEPARATOR:
				point = buffer.lastIndexOf('\n');
				if (point !== -1) {
					return {
						offset: point + 1,
						value: trim(buffer.slice(0, point)),
						line,
						column,
					};
				}
				break;
			default:
				break;
		}
		buffer += char;
		column++;
	}
	return {
		offset: i,
		value: buffer.trim(),
		line,
		column,
	};
};
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
	const properties = [];
	let buffer = '';
	let propName = '';
	let column = 0;

	for (let i = 0; i < propDefString.length; i++) {
		let char = propDefString[i];
		let isSkip = false;

		switch (char) {
			// just identing
			case TAB:
				char = ' ';
				break;
			case WHITE_SPACE:
				// when buffer is empty, it means 'parsing property name', so ignore the tab
				isSkip = buffer === '';
				break;

			// property name declaration ends
			case PROPERTY_NAME_SEPARATOR:
				propName = buffer.trim();
				if (propName === '') {
					throw new SyntaxError(
						`unexpected property name separator ':' found: ${buffer}`,
						line,
						column,
					);
				} else if (propName.indexOf('\n') > -1) {
					throw new SyntaxError(
						`unexpected linefeed token found`,
						line - 1,
						column,
					);
				} else if (!/^[a-z][a-zA-Z0-9]+$/.test(propName)) {
					throw new SyntaxError(
						`nested property name ${propName} should be lower camel case`,
						line,
						column,
					);
				}
				// eslint-disable-next-line no-case-declarations
				const {
					offset,
					value,
					line: newLine,
					column: newColumn,
				} = readValue(i + 1, propDefString, line, column);
				i += offset;
				line = newLine;
				column = newColumn;
				if (value === '') {
					throw new SyntaxError(
						`property value for ${propName} must not be empty`,
						line,
						column,
					);
				}
				properties.push(createNode(propName, value, line, column));
				buffer = '';
				isSkip = true;
				break;

			// property value declaration ends
			case LINE_FEED:
				isSkip = buffer.trim() === '';
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
	buffer = trim(buffer);
	if (buffer !== '') {
		throw new SyntaxError(
			`Unexpected character remains '${buffer}'`,
			line,
			column,
		);
	}
	// if (buffer === '') {
	// 	// if remain buffers are empty but property name exists,
	// 	// we should deal with syntax error which missing property value definition
	// 	if (propName !== '') {
	// 		properties.push(createNode(propName, buffer.trim(), line, column));
	// 	}
	// } else {
	// 	if (propName === '') {
	// 	}
	// 	properties.push(createNode(propName, buffer, line, column));
	// }

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
					start: { line, column },
				},
			} = node;
			const { code, propDefs } = dividePropertyDefinition(value);
			definitions.push({
				...createNode('code', code, line, column),
				propertyType: 'Code',
			});
			if (propDefs !== '') {
				definitions.push(
					// add 1 because property definition is the next line of code
					...parsePropertyDefinition(propDefs, line + 1),
				);
			}
		}

		if (hasChildren) {
			definitions = definitions.concat(...parseMultilineDefinition(node));
		}
		return definitions;
	}, []);
};

module.exports = parseMultilineDefinition;
