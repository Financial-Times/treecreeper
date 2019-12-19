// property nodes musn't have children if they have values
module.exports = (node, value) => {
	node.children = [];
	node.value = value;
	return node;
};
