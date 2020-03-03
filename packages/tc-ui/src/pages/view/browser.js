require('./main.css');

const initDeleteButton = () =>
	[...document.querySelectorAll('button.treecreeper-cta--delete')].forEach(
		button => {
			button.addEventListener('click', ev => {
				const response = window.confirm(
					'Are you sure you wish to delete?\n\nUnless you created something by accident, a more appropriate action is usually to mark the record as inactive, either in the Is Active or Lifecycle Stage fields,',
				);
				if (!response) {
					ev.preventDefault();
					ev.stopImmediatePropagation();
				}
			});
		},
	);

const initShowInactiveButtons = () =>
	[...document.querySelectorAll('button.show-inactive-button')].forEach(
		button => {
			const inactiveCount = button
				.closest('dd')
				.querySelectorAll('.inactive').length;
			if (inactiveCount) {
				button.textContent = `show ${inactiveCount} inactive records`;
			} else {
				button.parentNode.removeChild(button);
			}
			button.addEventListener('click', ev => {
				const classes = button.closest('dd').classList;
				classes.remove('hide-inactive');
				classes.add('reveal-inactive');
				ev.preventDefault();
				ev.stopImmediatePropagation();
				button.parentNode.removeChild(button);
			});
		},
	);

module.exports.init = () => {
	initDeleteButton();
	initShowInactiveButtons();
};
