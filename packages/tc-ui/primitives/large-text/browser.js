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
		if (!/></.test(container.querySelector('textarea').value)) {
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
