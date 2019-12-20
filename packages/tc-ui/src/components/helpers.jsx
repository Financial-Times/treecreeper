const React = require('react');

const showdown = require('showdown');

showdown.setFlavor('github');
const autolinker = require('autolinker');

const markdownParser = new showdown.Converter({
	simplifiedAutoLink: true,
});

const { format } = require('date-fns');

const formatValue = (value, formatString) =>
	value ? format(value, formatString) : null;

const formatTime = timeInput =>
	/* If date and time are given, time can be formatted but if not,
	time will be returned as it was inputted. This allows for manual time inputs
	*/
	format(timeInput, 'h:mm:ss a') !== 'Invalid Date'
		? format(timeInput, 'h:mm:ss a')
		: timeInput;

const formatDateTime = (value, type) => {
	if (type === 'DateTime') {
		return formatValue(value, 'D MMMM YYYY, h:mm:ss a');
	}
	if (type === 'Date') {
		return formatValue(value, 'D MMMM YYYY');
	}
	if (type === 'Time') {
		const timeInput = value;
		return formatTime(timeInput);
	}
};

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
	formatDateTime,
	LinkToRecord,
};
