const showdown = require('showdown');
const autolinker = require('autolinker');

showdown.setFlavor('github');

const markdownParser = new showdown.Converter({
	simplifiedAutoLink: true,
});

const markdownToHtml = text =>
	typeof window === 'undefined'
		? autolinker.link(markdownParser.makeHtml(text || ''))
		: // eslint-disable-next-line no-undef
		  Autolinker.link(markdownParser.makeHtml(text || ''));

module.exports = {
	markdownToHtml,
};
