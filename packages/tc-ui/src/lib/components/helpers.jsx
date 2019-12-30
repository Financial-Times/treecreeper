const React = require('react');

const showdown = require('showdown');

showdown.setFlavor('github');
const autolinker = require('autolinker');

const markdownParser = new showdown.Converter({
	simplifiedAutoLink: true,
});

const LinkToRecord = ({ id, type, value: { name, code } }) => (
	<a id={id} href={`/${type}/${encodeURIComponent(code)}`}>
		{name || code}
	</a>
);

module.exports = {
	markdown: text => autolinker.link(markdownParser.makeHtml(text || '')),
	autolink: text => autolinker.link(text || ''),
	toKebabCase: string =>
		string
			.split(' ')
			.map(str => str.toLowerCase())
			.join('-'),
	LinkToRecord,
};
