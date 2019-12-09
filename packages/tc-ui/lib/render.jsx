const { h, render } = require('preact');
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
