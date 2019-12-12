/*
	flattenNodeToPlainString - takes a node and returns an unstyled flat string
*/
function checkNodeHasStringValue(node) {
	return typeof node.value === 'string';
}

function checkNodeHasArrayValue(node) {
	return Array.isArray(node.value);
}

function checkNodeHasChildren(node) {
	return Array.isArray(node.children);
}

module.exports = function flattenNodeToPlainString({ children = [] } = {}) {
	return children.reduce((flattenedContent, node) => {
		const hasTextValue = checkNodeHasStringValue(node);
		const hasChildren = checkNodeHasChildren(node);
		const hasArrayValue = checkNodeHasArrayValue(node);

		if (hasTextValue) {
			return flattenedContent + node.value;
		}

		if (hasArrayValue) {
			return node.value;
		}

		if (hasChildren) {
			return flattenedContent + flattenNodeToPlainString(node);
		}

		return flattenedContent;
	}, '');
};
