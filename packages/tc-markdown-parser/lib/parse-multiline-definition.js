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

const createNode = (key, value, line, column) =>
	builder('property', {
		key,
		position: {
			start: {
				line,
				column: 0,
			},
			end: {
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
	const properties = [];
	let buffer = '';
	let propName = '';
	let column = 0;

	for (const char of propDefString) {
		let isSkip = false;

		switch (char) {
			// just identing
			case TAB:
				// when buffer is empty, it means 'parsing property name', so ignore the tab
				isSkip = buffer === '';
				break;

			// property name declaration ends
			case PROPERTY_NAME_SEPARATOR:
				buffer = buffer.trim();
				if (buffer === '') {
					throw new SyntaxError(
						`unexpected property name separator ':' found`,
						line,
						column,
					);
				} else if (!/^[a-z][a-zA-Z0-9]+$/.test(buffer)) {
					throw new SyntaxError(
						`nested property name ${buffer} should be lower camel case`,
						line,
						column,
					);
				}
				propName = buffer;
				buffer = '';
				isSkip = true;
				break;

			// property value declaration ends
			case LINE_FEED:
				buffer = buffer.trim();
				if (propName === '') {
					throw new SyntaxError(
						`unexpected linefeed token found`,
						line,
						column,
					);
				} else if (buffer === '') {
					throw new SyntaxError(
						`property value for ${propName} must not be empty`,
						line,
						column,
					);
				}
				properties.push(createNode(propName, buffer, line, column));
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
	if (buffer === '') {
		// if remain buffer is empty but property name exists,
		// we should deal with syntax error which missing property value definition
		if (propName !== '') {
			throw new SyntaxError(
				`property value for ${propName} must not be empty`,
				line,
				column,
			);
		}
	} else {
		buffer = buffer.trim();
		if (propName === '') {
			throw new SyntaxError(
				`Unexpected character remains '${buffer}'`,
				line,
				column,
			);
		} else if (buffer === '') {
			throw new SyntaxError(
				`property value for ${propName} must not be empty`,
				line,
				column,
			);
		}
		properties.push(createNode(propName, buffer, line, column));
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
