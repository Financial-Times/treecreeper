/*
	flattenNodeToPlainString - takes a node and returns an unstyled flat string
*/
function checkNodeHasStringValue(node) {
	return typeof node.value === 'string';
}

function checkNodeHasChildren(node) {
	return Array.isArray(node.children);
}

module.exports = function flattenNodeToPlainString({ children = [] } = {}) {
	return children.reduce((flattenedContent, node) => {
		const hasTextValue = checkNodeHasStringValue(node);
		const hasChildren = checkNodeHasChildren(node);

		if (hasTextValue) {
			return flattenedContent + node.value;
		}

		if (hasChildren) {
			return flattenedContent + flattenNodeToPlainString(node);
		}

		return flattenedContent;
	}, '');
};
