const build = require('unist-builder');

module.exports = ({
	message = '',
	position = {
		start: {
			line: 0,
		},
	},
}) => {
	return build('problem', {
		message,
		position,
	});
};
