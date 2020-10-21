require('./main.css');
const { init } = require('@financial-times/tc-schema-sdk');
const {
	RichRelationship: { withEditComponent: attachRichRelationshipPicker },
	LargeText: { withEditComponent: attachDocumentEditor },
} = require('../../primitives/browser');

const initSchema = async () => {
	const jsonNode = document.querySelector("[data-json='schema-data']");
	const jsonRaw = jsonNode.innerHTML.trim();
	const jsonData = jsonRaw.length ? JSON.parse(jsonRaw) : {};
	init({ schemaData: jsonData });
};

const initDocumentEditors = () => {
	[...document.querySelectorAll('[data-type="Document"]')].forEach(
		attachDocumentEditor,
	);
};

const initRelationshipSelectors = entireRecord => {
	[
		...document.querySelectorAll(
			'[data-component="rich-relationship-picker"]:not([data-disabled])',
		),
	].forEach(container =>
		attachRichRelationshipPicker(container, entireRecord),
	);
};

// TODO - the relationship editors should expose their bad state in some way
// (e.g set the hidden input as invalid? data-attribute?)
// That way the form can just, in quite a generic way query for invalid fields
const preventBadSubmission = () => {
	document
		.querySelector('form.o-layout__main')
		.addEventListener('submit', ev => {
			const editorsInUnselectedState = [
				...document.querySelectorAll(
					'[data-component="rich-relationship-picker"][data-is-unresolved]',
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
	text: field => !!field.querySelector('input').value,
	temporal: field => !!field.querySelector('input').value,
	number: field => !!field.querySelector('input').value,
	'large-text': field => !!field.querySelector('textarea').value,
	enum: field => !!field.querySelector('select').value,
	boolean: field =>
		!![...field.querySelectorAll('input')].some(input => input.checked),
	relationship: field =>
		!![...field.querySelectorAll('input[type="hidden"]')].every(
			input => !!input.value && input.value !== '[]',
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
						'[data-treecreeper-component]',
					),
				];
				const unfilledFields = essentialFields.filter(field => {
					const type = field.dataset.treecreeperComponent;
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

module.exports.init = async () => {
	await initSchema();
	const entireRecord = JSON.parse(
		document.querySelector('#tc-form').dataset.tcEntireRecord,
	);
	initDocumentEditors();
	initRelationshipSelectors(entireRecord);
	preventBadSubmission();
	preventIncompleteSubmission();
};
