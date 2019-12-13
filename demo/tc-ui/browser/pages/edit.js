/* global tinymce */

// const converter = require('html-to-markdown');

// const convertToMarkdown = el => {
// 	el.textContent = converter.convert(el.textContent);
// }

const {
	primitives: {
		Relationship: { withEditComponent: attachRelationshipPicker },
	},
} = require('@financial-times/tc-ui/browser');

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

const initDocumentEditors = () => {
	[...document.querySelectorAll('.wysiwyg-toggle')].forEach(el => {
		const container = el.closest('.o-forms-field');
		if (!/></.test(container.querySelector('textarea').value)) {
			el.parentNode.innerHTML = 'Edit using github flavoured markdown';
			return;
		}
		el.addEventListener(
			'click',
			ev => {
				ev.preventDefault();
				initWysiwyg(container);
				el.closest('.document-edit-tools').remove();
			},
			{
				once: true,
			},
		);
	});
};

const initRelationshipSelectors = () => {
	[
		...document.querySelectorAll(
			'[data-component="relationship-picker"]:not([data-disabled])',
		),
	].forEach(attachRelationshipPicker);
};

// TODO - the relationship editors should expose their bad state in some way
// (e.g set teh hidden input as invalid? data-attribute?)
// That way the form can just, in quite a generic way query for invalid fields
const preventBadSubmission = () => {
	document
		.querySelector('form.o-layout__main')
		.addEventListener('submit', ev => {
			const editorsInUnselectedState = [
				...document.querySelectorAll(
					'[data-component="relationship-picker"][data-is-unresolved]',
				),
			];
			if (editorsInUnselectedState.length) {
				const badFieldNames = editorsInUnselectedState.map(
					el => el.dataset.propertyName,
				);
				window.alert(`\
One or more relationship fields are in an unselected state.
Either clear the input value or select an entry using the arrow keys or the mouse.
These are the affected fields:
	${badFieldNames.join('\n\t')}`);
				ev.preventDefault();
				ev.stopImmediatePropagation();
				return false;
			}
		});
};

const fieldValueCheckers = {
	default: field => !!field.querySelector('input').value,
	textarea: field => !!field.querySelector('textarea').value,
	enum: field => !!field.querySelector('select').value,
	boolean: field =>
		!![...field.querySelectorAll('input')].some(input => input.checked),
	relationship: field =>
		!![...field.querySelectorAll('input[type="hidden"]')].every(
			input => !!input.value,
		),
};

const preventIncompleteSubmission = () => {
	const essentialFieldsFieldset = document.querySelector(
		'.fieldset-minimumViableRecord',
	);
	if (essentialFieldsFieldset) {
		document
			.querySelector('form.o-layout__main')
			.addEventListener('submit', ev => {
				const essentialFields = [
					...essentialFieldsFieldset.querySelectorAll(
						'[data-biz-ops-type]',
					),
				];
				const unfilledFields = essentialFields.filter(field => {
					const type = field.dataset.bizOpsType;
					const checker =
						fieldValueCheckers[type] || fieldValueCheckers.default;
					return !checker(field);
				});
				if (unfilledFields.length) {
					const saveIncomplete = window.prompt(
						`Please fill out all fields required for the minimum viable record before creating a new record.
Type SAVE INCOMPLETE RECORD below to proceed, or click cancel to return to the form`,
					);

					if (saveIncomplete !== 'SAVE INCOMPLETE RECORD') {
						ev.preventDefault();
						ev.stopImmediatePropagation();
						return false;
					}
				}
			});
	}
};

module.exports.init = () => {
	initDocumentEditors();
	initRelationshipSelectors();
	preventBadSubmission();
	preventIncompleteSubmission();
};
