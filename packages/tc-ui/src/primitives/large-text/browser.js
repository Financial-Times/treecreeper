require('./main.css');
/* global tinymce */
const initWysiwyg = container => {
	const textarea = container.querySelector('textarea');
	const description = container.querySelector('.description-text');
	description.innerHTML +=
		'<br><strong>Press space after entering a url to autocreate a link.</strong>';
	tinymce.init({
		selector: `#${textarea.id}`,
		plugins: 'code codesample table autolink lists advlist',
		toolbar:
			'bold italic underline codesample styleselect | bullist numlist | table outdent indent | code',
	});
};

module.exports = {
	withEditComponent: container => {
		// this is a slightly hacky way to detect when the text area has html in it. Checks for e.g.
		// 'span>   <em', '</p', '<div'
		// Better to be greedy than not greedy enough - if it thinks something is html that isn't the
		// only effect is to display a fairly unobtrusive button
		if (!/[a-z]+>\s*<[a-z]+|<\/[a-z]+|^<[a-z]+/i.test(container.querySelector('textarea').value)) {
			container.querySelector('.document-edit-tools').innerHTML =
				'Edit using github flavoured markdown';
			return;
		}
		container.querySelector('.wysiwyg-toggle').addEventListener(
			'click',
			ev => {
				ev.preventDefault();
				initWysiwyg(container);
				container.querySelector('.document-edit-tools').remove();
			},
			{
				once: true,
			},
		);
	},
};
