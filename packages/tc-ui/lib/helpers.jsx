const { h } = require('preact');

const LinkToRecord = ({ id, type, value: { name, code } }) => (
	<a id={id} href={`/${type}/${encodeURIComponent(code)}`}>
		{name || code}
	</a>
);

module.exports = { LinkToRecord };
