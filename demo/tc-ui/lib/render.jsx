const { render } = require('preact-render-to-string');
const { h } = require('preact');
const Layout = require('../templates/layout/layout');

module.exports = (Template, props) => {
	return `
<!DOCTYPE html>
${render(
	<Layout {...props}>
		<Template {...props} />
	</Layout>,
)}`;
};
