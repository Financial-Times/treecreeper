const marked = require('marked');
const autolinker = require('autolinker');

const markdownToHtml = (text = '') => {
	const html = marked(text, {
		// Enable GitHub flavoured Markdown
		gfm: true,
		// Enable smart quotes and other typographic enhancements
		smartypants: true,
	});

	return typeof window === 'undefined'
		? autolinker.link(html)
		: // eslint-disable-next-line no-undef
		  Autolinker.link(html);
};

module.exports = {
	markdownToHtml,
};
